import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, MapPin, Clock, Phone, Star, Calendar, Instagram, Facebook } from "lucide-react";

type SiteData = {
  profile: any;
  microsite: any | null;
  services: any[];
};

type ThemeId = "editorial" | "noir" | "mono";

const themes: Record<ThemeId, {
  bg: string; surface: string; text: string; subtext: string; muted: string; border: string;
  nav: string; cta: string; ctaText: string; chip: string; selection: string;
  display: string; serif: boolean;
}> = {
  editorial: {
    bg: "#faf7f2", surface: "#ffffff", text: "#1c1917", subtext: "#57534e", muted: "#a8a29e",
    border: "rgba(28,25,23,0.10)", nav: "rgba(250,247,242,0.75)",
    cta: "#1c1917", ctaText: "#faf7f2", chip: "rgba(28,25,23,0.06)",
    selection: "#1c1917", display: "'Cormorant Garamond', 'Playfair Display', Georgia, serif", serif: true,
  },
  noir: {
    bg: "#0a0a0a", surface: "#141414", text: "#fafafa", subtext: "#a3a3a3", muted: "#525252",
    border: "rgba(255,255,255,0.10)", nav: "rgba(10,10,10,0.75)",
    cta: "#fafafa", ctaText: "#0a0a0a", chip: "rgba(255,255,255,0.06)",
    selection: "#fafafa", display: "'Cormorant Garamond', 'Playfair Display', Georgia, serif", serif: true,
  },
  mono: {
    bg: "#ffffff", surface: "#fafafa", text: "#000000", subtext: "#525252", muted: "#a3a3a3",
    border: "rgba(0,0,0,0.10)", nav: "rgba(255,255,255,0.75)",
    cta: "#000000", ctaText: "#ffffff", chip: "rgba(0,0,0,0.05)",
    selection: "#000000", display: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", serif: false,
  },
};

const Microsite = () => {
  const params = useParams();
  const [slug, setSlug] = useState<string>("");
  const [data, setData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    const parts = host.split(".");
    const reserved = new Set([
      "www", "app", "admin", "api", "id-preview--d3037d9e-a098-4a0c-984e-428e241859a9",
    ]);
    let resolved = params.slug || "";
    if (!resolved && parts.length >= 3 && !reserved.has(parts[0])) {
      resolved = parts[0];
    }
    setSlug(resolved);
  }, [params.slug]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: res, error } = await supabase.rpc("get_microsite_by_slug", { _slug: slug });
      if (error || !res || !(res as any).profile) setNotFound(true);
      else setData(res as any);
      setLoading(false);
    })();
  }, [slug]);

  // Load serif font once
  useEffect(() => {
    if (document.getElementById("microsite-fonts")) return;
    const l = document.createElement("link");
    l.id = "microsite-fonts";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(l);
  }, []);

  const themeId: ThemeId = ((data?.microsite?.theme as ThemeId) || "editorial");
  const t = themes[themeId] || themes.editorial;
  const accent = data?.profile?.brand_color || "#c9a84c";

  const cssVars = useMemo(() => ({
    ["--ms-bg" as any]: t.bg,
    ["--ms-surface" as any]: t.surface,
    ["--ms-text" as any]: t.text,
    ["--ms-subtext" as any]: t.subtext,
    ["--ms-muted" as any]: t.muted,
    ["--ms-border" as any]: t.border,
    ["--ms-nav" as any]: t.nav,
    ["--ms-cta" as any]: t.cta,
    ["--ms-cta-text" as any]: t.ctaText,
    ["--ms-chip" as any]: t.chip,
    ["--ms-accent" as any]: accent,
    ["--ms-display" as any]: t.display,
  }), [t, accent]);

  if (loading) {
    return (
      <div style={{ background: t.bg, color: t.subtext }} className="min-h-screen flex items-center justify-center text-sm">
        Loading…
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div style={{ background: t.bg, color: t.text, fontFamily: "Inter, sans-serif" }} className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 style={{ fontFamily: t.display }} className="text-3xl md:text-4xl">Site not found</h1>
        <p style={{ color: t.subtext }} className="mt-2 text-sm">This booking link does not have a published site.</p>
      </div>
    );
  }

  const m = data.microsite || {};
  const p = data.profile;
  const businessName = p.business_name || "Studio";
  const headline = m.headline || businessName;
  const tagline = m.tagline || p.description || "Booking, made beautiful.";
  const about = m.about || "";
  const hero = m.hero_url || p.banner_url;
  const logo = m.logo_url || p.avatar_url;
  const gallery: string[] = Array.isArray(m.gallery) ? m.gallery : [];
  const bookingUrl = `/book/${p.booking_link}`;

  const display = (cls: string) => ({ className: cls, style: { fontFamily: t.display, fontWeight: t.serif ? 500 : 600, letterSpacing: t.serif ? "-0.01em" : "-0.03em" } });

  return (
    <div
      style={{ ...cssVars, background: "var(--ms-bg)", color: "var(--ms-text)", fontFamily: "Inter, -apple-system, sans-serif" } as any}
      className="min-h-screen antialiased"
    >
      <style>{`
        .ms-root ::selection { background: var(--ms-selection, var(--ms-text)); color: var(--ms-bg); }
        .ms-link { position: relative; }
        .ms-link::after { content: ""; position: absolute; left: 0; bottom: -2px; height: 1px; width: 100%; background: currentColor; transform: scaleX(0); transform-origin: right; transition: transform .4s cubic-bezier(.22,1,.36,1); }
        .ms-link:hover::after { transform: scaleX(1); transform-origin: left; }
        .ms-marquee { animation: ms-marquee 40s linear infinite; }
        @keyframes ms-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>

      <div className="ms-root">
        {/* Nav */}
        <header
          className="sticky top-0 z-30 backdrop-blur-xl"
          style={{ background: "var(--ms-nav)", borderBottom: "1px solid var(--ms-border)" }}
        >
          <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {logo && <img src={logo} alt="" className="h-8 w-8 rounded-full object-cover" style={{ outline: "1px solid var(--ms-border)" }} />}
              <span {...display("text-lg tracking-tight truncate")}>{businessName}</span>
            </div>
            <nav className="hidden md:flex items-center gap-7 text-[13px]" style={{ color: "var(--ms-subtext)" }}>
              {about && <a href="#about" className="ms-link hover:text-[color:var(--ms-text)] transition-colors">About</a>}
              {data.services?.length > 0 && <a href="#services" className="ms-link hover:text-[color:var(--ms-text)] transition-colors">Services</a>}
              {gallery.length > 0 && <a href="#gallery" className="ms-link hover:text-[color:var(--ms-text)] transition-colors">Gallery</a>}
              <a href="#visit" className="ms-link hover:text-[color:var(--ms-text)] transition-colors">Visit</a>
            </nav>
            <Link
              to={bookingUrl}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all hover:translate-y-[-1px]"
              style={{ background: "var(--ms-cta)", color: "var(--ms-cta-text)" }}
            >
              Book <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-5 md:px-8 pt-12 md:pt-24 pb-12 md:pb-20 grid md:grid-cols-12 gap-8 md:gap-12 items-end">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="md:col-span-7"
            >
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em]" style={{ color: "var(--ms-subtext)" }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--ms-accent)" }} />
                Atelier · est. {new Date().getFullYear()}
              </span>
              <h1 {...display("mt-5 text-[44px] sm:text-6xl md:text-7xl lg:text-[88px] leading-[0.95]")}>
                {headline}
              </h1>
              <p className="mt-5 md:mt-7 text-base md:text-lg max-w-xl leading-relaxed" style={{ color: "var(--ms-subtext)" }}>
                {tagline}
              </p>
              <div className="mt-7 md:mt-9 flex flex-wrap items-center gap-3">
                <Link
                  to={bookingUrl}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all hover:translate-y-[-1px]"
                  style={{ background: "var(--ms-cta)", color: "var(--ms-cta-text)" }}
                >
                  Book an appointment <ArrowUpRight className="h-4 w-4" />
                </Link>
                <a
                  href="#services"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors"
                  style={{ color: "var(--ms-text)", border: "1px solid var(--ms-border)" }}
                >
                  View services
                </a>
              </div>
              {p.rating_count > 0 && (
                <div className="mt-7 flex items-center gap-2 text-sm" style={{ color: "var(--ms-subtext)" }}>
                  <Star className="h-4 w-4" style={{ fill: "var(--ms-accent)", color: "var(--ms-accent)" }} />
                  <span className="font-medium" style={{ color: "var(--ms-text)" }}>{Number(p.rating).toFixed(1)}</span>
                  <span>· {p.rating_count} reviews</span>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="md:col-span-5"
            >
              <div
                className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px]"
                style={{ background: "var(--ms-chip)", boxShadow: "0 30px 80px -30px rgba(0,0,0,0.45)" }}
              >
                {hero ? (
                  <img src={hero} alt={businessName} className="h-full w-full object-cover" />
                ) : (
                  <div {...display("h-full w-full flex items-center justify-center text-2xl")} style={{ color: "var(--ms-muted)", fontFamily: t.display }}>
                    {businessName}
                  </div>
                )}
                <div
                  className="absolute inset-x-3 bottom-3 rounded-2xl backdrop-blur-md px-4 py-3 flex items-center justify-between"
                  style={{ background: themeId === "noir" ? "rgba(10,10,10,0.65)" : "rgba(255,255,255,0.85)", border: "1px solid var(--ms-border)" }}
                >
                  <div className="text-xs min-w-0">
                    <div className="font-medium truncate" style={{ color: "var(--ms-text)" }}>{businessName}</div>
                    {p.address && <div className="truncate max-w-[180px]" style={{ color: "var(--ms-subtext)" }}>{p.address}</div>}
                  </div>
                  <Link to={bookingUrl} className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--ms-accent)" }}>
                    Reserve →
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Marquee tagline */}
          <div className="overflow-hidden py-4 md:py-6" style={{ borderTop: "1px solid var(--ms-border)", borderBottom: "1px solid var(--ms-border)" }}>
            <div className="ms-marquee whitespace-nowrap flex gap-12" style={{ color: "var(--ms-muted)" }}>
              {Array.from({ length: 2 }).map((_, k) => (
                <div key={k} className="flex gap-12 shrink-0">
                  {["Crafted experience", "By appointment", "Curated services", "Est. " + new Date().getFullYear(), "Walk-ins welcome"].map((w, i) => (
                    <span key={i} {...display("text-2xl md:text-3xl tracking-tight")}>
                      {w} <span style={{ color: "var(--ms-accent)" }}>·</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        {about && (
          <section id="about" style={{ borderBottom: "1px solid var(--ms-border)" }}>
            <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-28 grid md:grid-cols-12 gap-8">
              <div className="md:col-span-3">
                <div className="text-[11px] uppercase tracking-[0.25em]" style={{ color: "var(--ms-subtext)" }}>About</div>
              </div>
              <div className="md:col-span-9">
                <p {...display("text-2xl md:text-3xl leading-[1.3]")} style={{ color: "var(--ms-text)", fontFamily: t.display, fontWeight: t.serif ? 500 : 500 }}>
                  {about.split(/\n\n+/)[0]}
                </p>
                {about.split(/\n\n+/).slice(1).map((para, i) => (
                  <p key={i} className="mt-5 text-base md:text-lg leading-relaxed" style={{ color: "var(--ms-subtext)" }}>{para}</p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Services */}
        {data.services && data.services.length > 0 && (
          <section id="services" style={{ borderBottom: "1px solid var(--ms-border)", background: "var(--ms-chip)" }}>
            <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-28">
              <div className="flex items-end justify-between gap-6 mb-10 md:mb-14 flex-wrap">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.25em] mb-3" style={{ color: "var(--ms-subtext)" }}>Menu</div>
                  <h2 {...display("text-4xl md:text-5xl")}>Services</h2>
                </div>
                <Link
                  to={bookingUrl}
                  className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium ms-link"
                  style={{ color: "var(--ms-text)" }}
                >
                  Book any service <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <ul style={{ borderTop: "1px solid var(--ms-border)" }}>
                {data.services.map((s: any, i: number) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, delay: i * 0.04 }}
                    className="py-5 md:py-6 flex items-baseline justify-between gap-4 md:gap-6"
                    style={{ borderBottom: "1px solid var(--ms-border)" }}
                  >
                    <div className="min-w-0">
                      <div {...display("text-xl md:text-2xl")}>{s.name}</div>
                      {s.duration && (
                        <div className="text-[11px] uppercase tracking-[0.2em] mt-1.5" style={{ color: "var(--ms-muted)" }}>
                          {s.duration} min
                        </div>
                      )}
                    </div>
                    <div className="flex-1 mx-2 md:mx-4 border-b border-dotted translate-y-1 hidden sm:block" style={{ borderColor: "var(--ms-border)" }} />
                    <div className="font-medium tabular-nums text-base md:text-lg whitespace-nowrap">${Number(s.price || 0).toFixed(0)}</div>
                  </motion.li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <section id="gallery" style={{ borderBottom: "1px solid var(--ms-border)" }}>
            <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-28">
              <div className="flex items-end justify-between mb-10 md:mb-14">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.25em] mb-3" style={{ color: "var(--ms-subtext)" }}>Portfolio</div>
                  <h2 {...display("text-4xl md:text-5xl")}>Gallery</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-4">
                {gallery.map((g, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: (i % 6) * 0.05 }}
                    className={`overflow-hidden rounded-2xl ${i % 5 === 0 ? "row-span-2 aspect-[3/4]" : "aspect-square"}`}
                    style={{ background: "var(--ms-chip)" }}
                  >
                    <img src={g} alt="" className="h-full w-full object-cover hover:scale-[1.04] transition duration-[1200ms]" />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Visit / CTA */}
        <section
          id="visit"
          style={{
            background: themeId === "editorial" ? "#1c1917" : (themeId === "noir" ? "#000000" : "#0a0a0a"),
            color: "#fafafa",
          }}
        >
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-28 grid md:grid-cols-2 gap-10 md:gap-12">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] mb-3 text-white/50">Reserve</div>
              <h2 {...display("text-4xl md:text-6xl text-white")}>Visit & book</h2>
              <p className="mt-5 text-white/60 max-w-md text-base md:text-lg leading-relaxed">
                Reserve a moment with us. Confirmation is instant — no calls, no waiting.
              </p>
              <Link
                to={bookingUrl}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white text-black px-6 py-3.5 text-sm font-medium hover:opacity-90 transition"
              >
                <Calendar className="h-4 w-4" /> Book now
              </Link>
            </div>
            <div className="space-y-5 text-sm md:text-base">
              {p.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-white/50 shrink-0" />
                  <span className="text-white/80">{p.address}</span>
                </div>
              )}
              {m.hours && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-1 text-white/50 shrink-0" />
                  <span className="whitespace-pre-line text-white/80">{m.hours}</span>
                </div>
              )}
              {p.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-1 text-white/50 shrink-0" />
                  <a href={`tel:${p.phone}`} className="hover:underline text-white/80">{p.phone}</a>
                </div>
              )}
              <div className="flex items-center gap-3 pt-3">
                {m.instagram && (
                  <a href={m.instagram} target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full border border-white/15 hover:bg-white/10 transition flex items-center justify-center text-white/80">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {m.facebook && (
                  <a href={m.facebook} target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full border border-white/15 hover:bg-white/10 transition flex items-center justify-center text-white/80">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {m.website_url && (
                  <a href={m.website_url} target="_blank" rel="noreferrer" className="text-white/60 hover:text-white text-xs underline underline-offset-4 ml-1">Website</a>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer style={{ background: themeId === "editorial" ? "#1c1917" : "#000" }}>
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-7 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/40 border-t border-white/10">
            <span>© {new Date().getFullYear()} {businessName}</span>
            <span>Powered by Cutzioo</span>
          </div>
        </footer>

        {/* Mobile sticky CTA */}
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 p-3" style={{ background: "linear-gradient(to top, var(--ms-bg) 60%, transparent)" }}>
          <Link
            to={bookingUrl}
            className="flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-medium shadow-lg"
            style={{ background: "var(--ms-cta)", color: "var(--ms-cta-text)" }}
          >
            <Calendar className="h-4 w-4" /> Book an appointment
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Microsite;

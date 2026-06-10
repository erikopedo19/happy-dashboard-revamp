import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowUpRight, MapPin, Clock, Phone, Star, Calendar, Check, Sparkles,
  Instagram, Facebook, Globe, ChevronRight, Shield, Zap, Heart, Award,
  Music2, Coffee, Scissors,
} from "lucide-react";

type SiteData = {
  profile: any;
  microsite: any | null;
  services: any[];
};

type ThemeId = "editorial" | "noir" | "mono";

type Tokens = {
  bg: string; surface: string; surfaceAlt: string; text: string; subtext: string; muted: string;
  border: string; nav: string; cta: string; ctaText: string; chip: string; accent: string;
  dark: boolean;
};

const buildTokens = (themeId: ThemeId, accent: string): Tokens => {
  if (themeId === "noir") return {
    bg: "#000000", surface: "#0e0e10", surfaceAlt: "#16161a", text: "#fafafa",
    subtext: "#a1a1aa", muted: "#52525b", border: "rgba(255,255,255,0.08)",
    nav: "rgba(10,10,12,0.72)", cta: accent, ctaText: "#ffffff",
    chip: "rgba(255,255,255,0.06)", accent, dark: true,
  };
  if (themeId === "mono") return {
    bg: "#f2f2f7", surface: "#ffffff", surfaceAlt: "#fafafa", text: "#000000",
    subtext: "#3c3c43", muted: "#8e8e93", border: "rgba(60,60,67,0.10)",
    nav: "rgba(242,242,247,0.78)", cta: "#000000", ctaText: "#ffffff",
    chip: "rgba(0,0,0,0.04)", accent, dark: false,
  };
  // editorial → soft warm iOS light
  return {
    bg: "#f5f3ee", surface: "#ffffff", surfaceAlt: "#faf8f4", text: "#1c1917",
    subtext: "#57534e", muted: "#a8a29e", border: "rgba(28,25,23,0.08)",
    nav: "rgba(245,243,238,0.78)", cta: "#1c1917", ctaText: "#faf7f2",
    chip: "rgba(28,25,23,0.05)", accent, dark: false,
  };
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

  useEffect(() => {
    if (document.getElementById("microsite-fonts")) return;
    const l = document.createElement("link");
    l.id = "microsite-fonts";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap";
    document.head.appendChild(l);
  }, []);

  const themeId: ThemeId = ((data?.microsite?.theme as ThemeId) || "editorial");
  const accent = data?.profile?.brand_color || "#e11d48";
  const t = useMemo(() => buildTokens(themeId, accent), [themeId, accent]);

  const cssVars = useMemo(() => ({
    ["--ms-bg" as any]: t.bg,
    ["--ms-surface" as any]: t.surface,
    ["--ms-surface-alt" as any]: t.surfaceAlt,
    ["--ms-text" as any]: t.text,
    ["--ms-subtext" as any]: t.subtext,
    ["--ms-muted" as any]: t.muted,
    ["--ms-border" as any]: t.border,
    ["--ms-nav" as any]: t.nav,
    ["--ms-cta" as any]: t.cta,
    ["--ms-cta-text" as any]: t.ctaText,
    ["--ms-chip" as any]: t.chip,
    ["--ms-accent" as any]: t.accent,
  }), [t]);

  if (loading) {
    return (
      <div style={{ background: t.bg, color: t.subtext }} className="min-h-screen flex items-center justify-center text-sm font-[Inter]">
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.6, repeat: Infinity }}
          className="h-3 w-3 rounded-full" style={{ background: t.accent }} />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div style={{ background: t.bg, color: t.text }} className="min-h-screen flex flex-col items-center justify-center px-6 text-center font-[Inter]">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Site not found</h1>
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
  const rating = Number(p.rating) || 0;
  const reviewCount = p.rating_count || 0;
  const features = [
    { icon: Zap, title: "Instant booking", desc: "Confirmed in seconds, no waiting." },
    { icon: Shield, title: "Secure & private", desc: "Your details are always protected." },
    { icon: Heart, title: "Loved by clients", desc: "Personalized to your style." },
    { icon: Award, title: "Premium service", desc: "Expert care, every visit." },
  ];

  return (
    <div
      style={{ ...cssVars, background: "var(--ms-bg)", color: "var(--ms-text)", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" } as any}
      className="min-h-screen antialiased"
    >
      <style>{`
        .ms-root { letter-spacing: -0.011em; }
        .ms-root ::selection { background: var(--ms-accent); color: white; }
        .ms-display { letter-spacing: -0.035em; font-weight: 700; }
        .ms-hairline { box-shadow: inset 0 0 0 0.5px var(--ms-border); }
        @keyframes ms-marq { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ms-marq { animation: ms-marq 35s linear infinite; }
        .ms-card { background: var(--ms-surface); border: 1px solid var(--ms-border); border-radius: 28px; }
        .ms-tap { transition: transform .2s cubic-bezier(.22,1,.36,1); }
        .ms-tap:active { transform: scale(0.97); }
      `}</style>

      <div className="ms-root pb-28 md:pb-0">
        {/* Floating iOS-style Nav */}
        <header className="sticky top-0 z-40 px-3 md:px-6 pt-3 md:pt-4">
          <div
            className="max-w-6xl mx-auto flex items-center justify-between gap-3 rounded-full px-3 md:px-4 h-14 backdrop-blur-2xl ms-hairline"
            style={{ background: t.nav }}
          >
            <Link to="#" className="flex items-center gap-2.5 min-w-0 pl-1">
              {logo
                ? <img src={logo} alt="" className="h-9 w-9 rounded-full object-cover ms-hairline" />
                : <div className="h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-bold" style={{ background: t.accent, color: "#fff" }}>{businessName.slice(0,1)}</div>
              }
              <span className="font-semibold text-[15px] tracking-tight truncate">{businessName}</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-[13px] font-medium" style={{ color: t.subtext }}>
              {data.services?.length > 0 && <a href="#services" className="px-3 py-1.5 rounded-full hover:bg-[color:var(--ms-chip)] transition">Services</a>}
              {gallery.length > 0 && <a href="#gallery" className="px-3 py-1.5 rounded-full hover:bg-[color:var(--ms-chip)] transition">Gallery</a>}
              <a href="#visit" className="px-3 py-1.5 rounded-full hover:bg-[color:var(--ms-chip)] transition">Visit</a>
            </nav>
            <Link
              to={bookingUrl}
              className="ms-tap inline-flex items-center gap-1.5 rounded-full px-4 h-10 text-[13px] font-semibold"
              style={{ background: "var(--ms-cta)", color: "var(--ms-cta-text)" }}
            >
              Book <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* HERO — App Store style */}
        <section className="px-3 md:px-6 mt-4 md:mt-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-6xl mx-auto rounded-[36px] overflow-hidden ms-hairline"
            style={{ background: t.surface, minHeight: "min(78vh, 720px)" }}
          >
            {/* Hero image fills card */}
            {hero ? (
              <img src={hero} alt={businessName} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${t.accent}22, ${t.accent}05)` }} />
            )}
            {/* Gradient scrim */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)" }} />

            {/* Top chip */}
            <div className="absolute top-5 left-5 md:top-7 md:left-7">
              <div className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full backdrop-blur-xl bg-white/15 border border-white/20 text-[11px] font-semibold text-white">
                <Sparkles className="h-3 w-3" /> {p.city || "Now booking"}
              </div>
            </div>

            {/* Bottom content */}
            <div className="absolute inset-x-0 bottom-0 p-5 md:p-10">
              <div className="max-w-2xl">
                <motion.h1
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="ms-display text-white text-[42px] leading-[1.02] sm:text-6xl md:text-7xl"
                >
                  {headline}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.25 }}
                  className="mt-4 text-white/85 text-base md:text-lg max-w-xl leading-relaxed"
                >
                  {tagline}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.35 }}
                  className="mt-6 flex flex-wrap items-center gap-2.5"
                >
                  <Link
                    to={bookingUrl}
                    className="ms-tap inline-flex items-center gap-2 rounded-full px-6 h-12 text-[15px] font-semibold shadow-lg"
                    style={{ background: t.accent, color: "#fff", boxShadow: `0 14px 40px -10px ${t.accent}` }}
                  >
                    <Calendar className="h-4 w-4" /> Book appointment
                  </Link>
                  <a
                    href="#services"
                    className="ms-tap inline-flex items-center gap-2 rounded-full px-5 h-12 text-[14px] font-semibold backdrop-blur-xl bg-white/15 border border-white/20 text-white"
                  >
                    See services <ChevronRight className="h-4 w-4" />
                  </a>
                </motion.div>

                {/* Mini stat strip */}
                <div className="mt-7 flex items-center gap-5 text-white/85 text-[13px]">
                  {rating > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-current" style={{ color: "#fbbf24" }} />
                      <span className="font-semibold">{rating.toFixed(1)}</span>
                      <span className="text-white/60">· {reviewCount} reviews</span>
                    </div>
                  )}
                  {data.services?.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1.5">
                      <Scissors className="h-3.5 w-3.5" />
                      <span>{data.services.length} services</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* STAT CARDS — iOS widget row */}
        <section className="px-3 md:px-6 mt-3">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Rating", value: rating > 0 ? rating.toFixed(1) : "New", sub: rating > 0 ? `${reviewCount} reviews` : "Be the first", icon: Star, accent: true },
              { label: "Services", value: String(data.services?.length || 0), sub: "Available now", icon: Scissors },
              { label: "Open", value: m.hours ? "Today" : "By appt.", sub: m.hours ? "Tap to see hours" : "Reserve a slot", icon: Clock },
              { label: "Location", value: p.city || "Studio", sub: p.address ? "View on map" : "Online booking", icon: MapPin },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="ms-card p-4 md:p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: t.subtext }}>{s.label}</div>
                  <s.icon className="h-3.5 w-3.5" style={{ color: s.accent ? t.accent : t.muted, fill: s.accent && rating > 0 ? t.accent : "none" }} />
                </div>
                <div className="mt-3 text-2xl md:text-3xl ms-display">{s.value}</div>
                <div className="text-[12px] mt-0.5" style={{ color: t.subtext }}>{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* WHY US — iOS feature grid */}
        <section className="px-3 md:px-6 mt-3">
          <div className="max-w-6xl mx-auto ms-card p-5 md:p-8">
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: t.accent }}>Why us</div>
                <h2 className="ms-display text-2xl md:text-3xl">A better way to book</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  className="rounded-2xl p-4"
                  style={{ background: t.surfaceAlt, border: `1px solid ${t.border}` }}
                >
                  <div className="h-9 w-9 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${t.accent}18`, color: t.accent }}>
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div className="text-[14px] font-semibold">{f.title}</div>
                  <div className="text-[12px] mt-0.5 leading-relaxed" style={{ color: t.subtext }}>{f.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT */}
        {about && (
          <section id="about" className="px-3 md:px-6 mt-3">
            <div className="max-w-6xl mx-auto ms-card p-5 md:p-10 grid md:grid-cols-12 gap-6 md:gap-10">
              <div className="md:col-span-4">
                <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: t.accent }}>About</div>
                <h2 className="ms-display text-2xl md:text-3xl mt-2">Our story</h2>
              </div>
              <div className="md:col-span-8">
                <p className="text-lg md:text-xl leading-[1.55]" style={{ color: t.text }}>
                  {about.split(/\n\n+/)[0]}
                </p>
                {about.split(/\n\n+/).slice(1).map((para, i) => (
                  <p key={i} className="mt-4 text-[15px] leading-relaxed" style={{ color: t.subtext }}>{para}</p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* SERVICES — App Store list */}
        {data.services && data.services.length > 0 && (
          <section id="services" className="px-3 md:px-6 mt-3">
            <div className="max-w-6xl mx-auto ms-card p-5 md:p-8">
              <div className="flex items-end justify-between gap-6 mb-5 flex-wrap">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: t.accent }}>Menu</div>
                  <h2 className="ms-display text-2xl md:text-3xl">Services</h2>
                </div>
                <Link
                  to={bookingUrl}
                  className="ms-tap hidden md:inline-flex items-center gap-1.5 text-[13px] font-semibold rounded-full px-4 h-10"
                  style={{ background: t.chip, color: t.text }}
                >
                  Book any <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <ul className="divide-y" style={{ borderColor: t.border }}>
                {data.services.map((s: any, i: number) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{ duration: 0.45, delay: i * 0.04 }}
                    style={{ borderColor: t.border }}
                  >
                    <Link to={bookingUrl} className="group flex items-center gap-4 py-4 md:py-5 ms-tap">
                      <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${t.accent}14`, color: t.accent }}>
                        <Scissors className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[15px] md:text-base truncate">{s.name}</div>
                        <div className="text-[12px] mt-0.5" style={{ color: t.subtext }}>
                          {s.duration ? `${s.duration} min` : "Custom duration"}
                          {s.description ? ` · ${s.description}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold tabular-nums text-[15px] md:text-base whitespace-nowrap">${Number(s.price || 0).toFixed(0)}</div>
                        <div className="text-[11px] font-medium mt-0.5 group-hover:translate-x-0.5 transition-transform" style={{ color: t.accent }}>Book →</div>
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* GALLERY */}
        {gallery.length > 0 && (
          <section id="gallery" className="px-3 md:px-6 mt-3">
            <div className="max-w-6xl mx-auto ms-card p-5 md:p-8">
              <div className="flex items-end justify-between mb-5">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: t.accent }}>Portfolio</div>
                  <h2 className="ms-display text-2xl md:text-3xl">Recent work</h2>
                </div>
                <div className="text-[12px] font-medium" style={{ color: t.subtext }}>{gallery.length} photos</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
                {gallery.map((g, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.96 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.55, delay: (i % 6) * 0.05 }}
                    className={`overflow-hidden rounded-3xl ms-hairline ${i % 5 === 0 ? "row-span-2 aspect-[3/4]" : "aspect-square"}`}
                    style={{ background: t.chip }}
                  >
                    <img src={g} alt="" className="h-full w-full object-cover hover:scale-[1.04] transition duration-[1200ms]" />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TESTIMONIAL (synthetic if no reviews) */}
        <section className="px-3 md:px-6 mt-3">
          <div className="max-w-6xl mx-auto ms-card p-6 md:p-12 text-center" style={{ background: t.dark ? t.surface : t.surfaceAlt }}>
            <div className="flex justify-center gap-0.5 mb-5">
              {[0,1,2,3,4].map(i => (
                <Star key={i} className="h-4 w-4" style={{ color: "#fbbf24", fill: "#fbbf24" }} />
              ))}
            </div>
            <p className="ms-display text-2xl md:text-4xl max-w-3xl mx-auto leading-[1.25]">
              “{rating >= 4.5 ? `One of the best experiences in ${p.city || "town"}. Booking was effortless and the result was perfect.` : `A modern way to book — clean, simple, and the service is exceptional.`}”
            </p>
            <div className="mt-6 text-[13px] font-medium" style={{ color: t.subtext }}>
              {reviewCount > 0 ? `From ${reviewCount} happy clients` : "From our clients"}
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section className="px-3 md:px-6 mt-3">
          <div
            className="max-w-6xl mx-auto rounded-[36px] p-7 md:p-14 relative overflow-hidden"
            style={{ background: t.dark ? `linear-gradient(135deg, ${t.accent}, ${t.accent}cc)` : `linear-gradient(135deg, ${t.accent}, ${t.accent}dd)` }}
          >
            <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-30 bg-white" />
            <div className="absolute -bottom-24 -left-10 h-60 w-60 rounded-full blur-3xl opacity-20 bg-white" />
            <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-white/80 mb-2">Ready when you are</div>
                <h2 className="ms-display text-white text-3xl md:text-5xl max-w-xl">Book your next visit in seconds.</h2>
                <p className="text-white/85 mt-3 max-w-md">Real-time availability, instant confirmation, no phone calls.</p>
              </div>
              <Link
                to={bookingUrl}
                className="ms-tap inline-flex items-center gap-2 rounded-full bg-white text-black px-6 h-13 py-3.5 text-[15px] font-semibold self-start shadow-xl"
              >
                <Calendar className="h-4 w-4" /> Book now
              </Link>
            </div>
          </div>
        </section>

        {/* VISIT */}
        <section id="visit" className="px-3 md:px-6 mt-3">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-3">
            <div className="ms-card p-5 md:p-8">
              <div className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: t.accent }}>Visit</div>
              <h3 className="ms-display text-2xl md:text-3xl">Find us</h3>
              <div className="mt-5 space-y-4 text-[14px]">
                {(m.address || p.address) && (
                  <Row icon={<MapPin className="h-4 w-4" />} t={t} label="Address">
                    {m.address || p.address}
                  </Row>
                )}
                {m.hours && (
                  <Row icon={<Clock className="h-4 w-4" />} t={t} label="Hours">
                    <span className="whitespace-pre-line">{m.hours}</span>
                  </Row>
                )}
                {p.phone && (
                  <Row icon={<Phone className="h-4 w-4" />} t={t} label="Phone">
                    <a href={`tel:${p.phone}`} className="underline-offset-4 hover:underline">{p.phone}</a>
                  </Row>
                )}
              </div>
            </div>

            <div className="ms-card p-5 md:p-8">
              <div className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: t.accent }}>Connect</div>
              <h3 className="ms-display text-2xl md:text-3xl">Follow along</h3>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {m.instagram && <Social href={m.instagram} icon={<Instagram className="h-4 w-4" />} label="Instagram" t={t} />}
                {m.facebook && <Social href={m.facebook} icon={<Facebook className="h-4 w-4" />} label="Facebook" t={t} />}
                {m.tiktok && <Social href={m.tiktok} icon={<Music2 className="h-4 w-4" />} label="TikTok" t={t} />}
                {m.website_url && <Social href={m.website_url} icon={<Globe className="h-4 w-4" />} label="Website" t={t} />}
                {!m.instagram && !m.facebook && !m.tiktok && !m.website_url && (
                  <div className="col-span-2 text-[13px]" style={{ color: t.subtext }}>Add your social profiles in the editor to display them here.</div>
                )}
              </div>

              <div className="mt-6 rounded-2xl p-4 flex items-center gap-3" style={{ background: t.chip }}>
                <Coffee className="h-5 w-5" style={{ color: t.accent }} />
                <div className="text-[13px]" style={{ color: t.subtext }}>
                  Walk-ins welcome — but a quick booking guarantees your spot.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-3 md:px-6 mt-3">
          <div className="max-w-6xl mx-auto ms-card p-5 md:p-8">
            <div className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: t.accent }}>FAQ</div>
            <h3 className="ms-display text-2xl md:text-3xl mb-5">Good to know</h3>
            <div className="divide-y" style={{ borderColor: t.border }}>
              {[
                { q: "How do I book?", a: "Tap any service or the Book button — you'll pick a time and confirm in seconds." },
                { q: "Can I reschedule?", a: "Yes. Use the link in your confirmation email or message us directly." },
                { q: "Do you accept walk-ins?", a: "Whenever possible. Booking ahead is recommended for peak hours." },
                { q: "What payment methods are accepted?", a: "Cash and major cards are accepted in-store. Some services may require a deposit." },
              ].map((f, i) => (
                <details key={i} className="group py-4" style={{ borderColor: t.border }}>
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <span className="font-semibold text-[15px]">{f.q}</span>
                    <span className="h-7 w-7 rounded-full flex items-center justify-center transition-transform group-open:rotate-45" style={{ background: t.chip, color: t.text }}>+</span>
                  </summary>
                  <p className="mt-2 text-[14px] leading-relaxed pr-10" style={{ color: t.subtext }}>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Marquee */}
        <section className="px-3 md:px-6 mt-3 overflow-hidden">
          <div className="max-w-6xl mx-auto ms-card py-5 overflow-hidden">
            <div className="ms-marq whitespace-nowrap flex gap-10" style={{ color: t.muted }}>
              {Array.from({ length: 2 }).map((_, k) => (
                <div key={k} className="flex gap-10 shrink-0 px-5">
                  {[`${businessName}`, "Booking made simple", "Crafted experience", "By appointment", `Est. ${new Date().getFullYear()}`, "Walk-ins welcome"].map((w, i) => (
                    <span key={i} className="ms-display text-2xl md:text-3xl">
                      {w} <span style={{ color: t.accent }}>·</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-3 md:px-6 mt-3 mb-3">
          <div className="max-w-6xl mx-auto ms-card px-5 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-[12px]" style={{ color: t.subtext }}>
            <div className="flex items-center gap-2.5">
              {logo && <img src={logo} alt="" className="h-7 w-7 rounded-full object-cover" />}
              <span>© {new Date().getFullYear()} {businessName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Powered by</span>
              <span className="font-semibold" style={{ color: t.text }}>Cutzioo</span>
            </div>
          </div>
        </footer>

        {/* Mobile sticky CTA */}
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 p-3" style={{ background: `linear-gradient(to top, ${t.bg} 55%, transparent)` }}>
          <Link
            to={bookingUrl}
            className="ms-tap flex items-center justify-center gap-2 rounded-full h-13 py-3.5 text-[15px] font-semibold shadow-2xl"
            style={{ background: t.accent, color: "#fff", boxShadow: `0 18px 40px -10px ${t.accent}` }}
          >
            <Calendar className="h-4 w-4" /> Book appointment
          </Link>
        </div>
      </div>
    </div>
  );
};

const Row = ({ icon, t, label, children }: any) => (
  <div className="flex items-start gap-3">
    <div className="h-9 w-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: t.chip, color: t.accent }}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: t.muted }}>{label}</div>
      <div className="text-[14px] mt-0.5" style={{ color: t.text }}>{children}</div>
    </div>
  </div>
);

const Social = ({ href, icon, label, t }: any) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="ms-tap flex items-center justify-between gap-2 rounded-2xl px-4 h-12 transition"
    style={{ background: t.chip, color: t.text }}
  >
    <span className="flex items-center gap-2.5">
      <span className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: t.accent, color: "#fff" }}>{icon}</span>
      <span className="text-[13px] font-semibold">{label}</span>
    </span>
    <ArrowUpRight className="h-4 w-4" style={{ color: t.muted }} />
  </a>
);

export default Microsite;

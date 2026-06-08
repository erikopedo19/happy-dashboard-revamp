import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, Instagram, Facebook, MapPin, Clock, Phone, Star, Calendar } from "lucide-react";

type SiteData = {
  profile: any;
  microsite: any | null;
  services: any[];
};

const Microsite = () => {
  const params = useParams();
  const [slug, setSlug] = useState<string>("");
  const [data, setData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Resolve slug: prefer subdomain, fallback to :slug param
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
      if (error || !res || !(res as any).profile) {
        setNotFound(true);
      } else {
        setData(res as any);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center text-stone-500 text-sm">
        Loading…
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-serif text-stone-800">Site not found</h1>
        <p className="mt-2 text-stone-500">This booking link does not have a published site.</p>
      </div>
    );
  }

  const m = data.microsite || {};
  const p = data.profile;
  const accent = p.brand_color || "#0A84FF";
  const businessName = p.business_name || "Studio";
  const headline = m.headline || businessName;
  const tagline = m.tagline || p.description || "Booking, made beautiful.";
  const about = m.about || "";
  const hero = m.hero_url || p.banner_url;
  const logo = m.logo_url || p.avatar_url;
  const gallery: string[] = Array.isArray(m.gallery) ? m.gallery : [];
  const bookingUrl = `/book/${p.booking_link}`;

  return (
    <div className="min-h-screen bg-[#faf7f2] text-stone-900 font-sans selection:bg-stone-900 selection:text-[#faf7f2]">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[#faf7f2]/70 border-b border-stone-200/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logo && <img src={logo} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-stone-200" />}
            <span className="font-serif text-lg tracking-tight">{businessName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-stone-600">
            <a href="#about" className="hover:text-stone-900 transition">About</a>
            <a href="#services" className="hover:text-stone-900 transition">Services</a>
            {gallery.length > 0 && <a href="#gallery" className="hover:text-stone-900 transition">Gallery</a>}
            <a href="#visit" className="hover:text-stone-900 transition">Visit</a>
          </nav>
          <Link
            to={bookingUrl}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 transition"
            style={{ backgroundColor: "#1c1917" }}
          >
            Book <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-12 md:pb-20 grid md:grid-cols-12 gap-10 items-end">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="md:col-span-7"
          >
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-500">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
              Atelier · est. {new Date().getFullYear()}
            </span>
            <h1 className="mt-5 font-serif text-5xl md:text-7xl leading-[0.95] tracking-tight text-stone-900">
              {headline}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-stone-600 max-w-xl leading-relaxed">
              {tagline}
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                to={bookingUrl}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white shadow-sm hover:translate-y-[-1px] transition"
                style={{ backgroundColor: "#1c1917" }}
              >
                Book an appointment <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-stone-700 border border-stone-300 hover:bg-stone-100 transition"
              >
                View services
              </a>
            </div>
            {p.rating_count > 0 && (
              <div className="mt-8 flex items-center gap-2 text-sm text-stone-600">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-medium text-stone-800">{Number(p.rating).toFixed(1)}</span>
                <span>· {p.rating_count} reviews</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="md:col-span-5"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] bg-stone-200 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]">
              {hero ? (
                <img src={hero} alt={businessName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-stone-400 font-serif text-2xl">
                  {businessName}
                </div>
              )}
              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/85 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="text-xs text-stone-500">
                  <div className="font-medium text-stone-900">{businessName}</div>
                  {p.address && <div className="truncate max-w-[180px]">{p.address}</div>}
                </div>
                <Link to={bookingUrl} className="text-xs font-medium" style={{ color: accent }}>
                  Reserve →
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About */}
      {about && (
        <section id="about" className="border-t border-stone-200/60">
          <div className="max-w-4xl mx-auto px-6 py-20 md:py-28">
            <h2 className="font-serif text-3xl md:text-4xl text-stone-900">About</h2>
            <p className="mt-6 text-lg leading-relaxed text-stone-700 whitespace-pre-line">{about}</p>
          </div>
        </section>
      )}

      {/* Services */}
      {data.services && data.services.length > 0 && (
        <section id="services" className="border-t border-stone-200/60 bg-white/40">
          <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
            <div className="flex items-end justify-between gap-6 mb-10">
              <div>
                <h2 className="font-serif text-3xl md:text-4xl text-stone-900">Services</h2>
                <p className="mt-2 text-stone-500">Curated, transparent pricing.</p>
              </div>
              <Link
                to={bookingUrl}
                className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-stone-900 border-b border-stone-900"
              >
                Book any service <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ul className="divide-y divide-stone-200/80">
              {data.services.map((s: any) => (
                <li key={s.id} className="py-5 flex items-baseline justify-between gap-6 group">
                  <div>
                    <div className="font-serif text-xl text-stone-900">{s.name}</div>
                    {s.duration && <div className="text-xs uppercase tracking-wider text-stone-400 mt-1">{s.duration} min</div>}
                  </div>
                  <div className="flex-1 mx-4 border-b border-dotted border-stone-300 translate-y-1" />
                  <div className="font-medium text-stone-900 tabular-nums">${Number(s.price || 0).toFixed(0)}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section id="gallery" className="border-t border-stone-200/60">
          <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
            <h2 className="font-serif text-3xl md:text-4xl text-stone-900 mb-10">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {gallery.map((g, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.04 }}
                  className={`overflow-hidden rounded-2xl bg-stone-200 ${i % 5 === 0 ? "row-span-2 aspect-[3/4]" : "aspect-square"}`}
                >
                  <img src={g} alt="" className="h-full w-full object-cover hover:scale-105 transition duration-700" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Visit / CTA */}
      <section id="visit" className="border-t border-stone-200/60 bg-stone-900 text-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl">Visit & book</h2>
            <p className="mt-4 text-stone-400 max-w-md">
              Reserve a moment with us. Confirmation is instant.
            </p>
            <Link
              to={bookingUrl}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white text-stone-900 px-6 py-3 text-sm font-medium hover:bg-stone-100 transition"
            >
              <Calendar className="h-4 w-4" /> Book now
            </Link>
          </div>
          <div className="space-y-5 text-sm">
            {p.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-stone-400" />
                <span>{p.address}</span>
              </div>
            )}
            {m.hours && (
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-stone-400" />
                <span className="whitespace-pre-line">{m.hours}</span>
              </div>
            )}
            {p.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 text-stone-400" />
                <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a>
              </div>
            )}
            <div className="flex items-center gap-4 pt-2">
              {m.instagram && (
                <a href={m.instagram} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-white"><Instagram className="h-5 w-5" /></a>
              )}
              {m.facebook && (
                <a href={m.facebook} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-white"><Facebook className="h-5 w-5" /></a>
              )}
              {m.website_url && (
                <a href={m.website_url} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-white text-xs underline">Website</a>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-stone-900 text-stone-500 text-xs">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-stone-800">
          <span>© {new Date().getFullYear()} {businessName}</span>
          <span>Powered by Cutzioo</span>
        </div>
      </footer>
    </div>
  );
};

export default Microsite;

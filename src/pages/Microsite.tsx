import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, MapPin, Clock, Phone, Star, Calendar, Globe, Music2, MessageCircle, Scissors } from "lucide-react";

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
const IMG = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?q=75&w=${w}&auto=format&fit=crop`;
const STOCK = {
  hero: IMG("1503951914875-452162b0f3f1", 1600),
  cta: IMG("1585747860715-2ba37e788b70", 1400),
  footer: IMG("1517832606299-7ae9b720a186", 1600),
  gallery: [
    IMG("1622286342621-4bd786c2447c", 800),
    IMG("1622288432450-277d0fef5ed6", 800),
    IMG("1599351431202-1e0f0137899a", 800),
    IMG("1621605815971-fbc98d665033", 800),
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

const ease = [0.22, 1, 0.36, 1] as const;
const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.7, delay, ease },
});

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

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 700], [0, 120]);
  const heroScale = useTransform(scrollY, [0, 700], [1.04, 1.14]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0C]">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="h-2.5 w-2.5 rounded-full bg-[#FF2D46]"
        />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0B0C] px-6 text-center text-white">
        <h1 className="text-3xl font-semibold tracking-tight">Site not found</h1>
        <p className="mt-2 text-sm text-white/50">This barber doesn't have a published site yet.</p>
        <a href="https://cutzioo.com" className="mt-8 text-[12px] text-white/40">Made with <span className="font-semibold text-white/70">Cutzioo</span></a>
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
  const socials = [
    m.instagram && { href: m.instagram, label: "Instagram", icon: Globe },
    m.tiktok && { href: m.tiktok, label: "TikTok", icon: Music2 },
    m.facebook && { href: m.facebook, label: "Facebook", icon: Globe },
    m.whatsapp && {
      href: String(m.whatsapp).startsWith("http") ? m.whatsapp : `https://wa.me/${String(m.whatsapp).replace(/[^0-9]/g, "")}`,
      label: "WhatsApp",
      icon: MessageCircle,
    },
    m.website_url && { href: m.website_url, label: "Website", icon: Globe },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Globe }[];
  const featured = services.slice(0, 3);
  const rest = services.slice(3);
  const price = (v: number | null) => `$${Number(v || 0).toFixed(0)}`;

  return (
    <div
      className="min-h-screen bg-[#0B0B0C] text-white antialiased"
      style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif", letterSpacing: "-0.011em" }}
    >
      {/* HERO */}
      <section className="relative px-3 pt-3 md:px-5 md:pt-5">
        <div className="relative mx-auto flex max-w-6xl flex-col overflow-hidden rounded-[28px] md:rounded-[36px]" style={{ minHeight: "min(84vh, 740px)" }}>
          <motion.img
            src={hero}
            alt={businessName}
            fetchPriority="high"
            decoding="async"
            style={{ y: heroY, scale: heroScale }}
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.05)_35%,rgba(0,0,0,0.35)_70%,#0B0B0C_100%)]" />

          <header className="relative z-10 flex items-center justify-between gap-3 px-4 pt-4 md:px-7 md:pt-6">
            <div className="flex min-w-0 items-center gap-2.5">
              {logo ? (
                <img src={logo} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/30" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[13px] font-bold text-black">{businessName.slice(0, 1)}</div>
              )}
              <span className="truncate text-[15px] font-semibold tracking-tight">{businessName}</span>
            </div>
            <nav className="hidden items-center gap-6 text-[13px] font-medium text-white/75 md:flex">
              {about && <a href="#about" className="hover:text-white">About</a>}
              {services.length > 0 && <a href="#services" className="hover:text-white">Services</a>}
              <a href="#work" className="hover:text-white">Work</a>
              <a href="#visit" className="hover:text-white">Visit</a>
            </nav>
            <Link to={bookingUrl} className="inline-flex h-9 items-center gap-1 rounded-full bg-white px-4 text-[13px] font-semibold text-black transition active:scale-95">
              Book <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </header>

          <div className="relative z-10 mt-auto flex flex-col items-center px-6 pb-12 pt-24 text-center md:pb-20">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white/80 backdrop-blur-md"
            >
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)} · {reviewCount} reviews
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease }}
              className="mt-5 max-w-3xl text-[42px] font-medium leading-[1.02] tracking-[-0.045em] sm:text-6xl md:text-7xl"
            >
              {headline}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.22, ease }}
              className="mt-4 max-w-md text-[15px] leading-relaxed text-white/70"
            >
              {tagline}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.32, ease }}
            >
              <Link to={bookingUrl} className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-black transition active:scale-95">
                <Calendar className="h-4 w-4" /> Book a chair
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      {about && (
        <section id="about" className="mx-auto max-w-6xl px-5 pt-20 md:px-8 md:pt-28">
          <div className="grid gap-6 md:grid-cols-12 md:gap-12">
            <motion.div {...rise()} className="md:col-span-4">
              <Pill>About</Pill>
              <h2 className="mt-4 text-[30px] font-medium leading-[1.1] tracking-[-0.035em] md:text-4xl">The story behind the chair</h2>
            </motion.div>
            <motion.div {...rise(0.08)} className="md:col-span-8">
              {about.split(/\n\n+/).map((para, i) => (
                <p key={i} className={i === 0 ? "text-[18px] leading-[1.6] text-white/85 md:text-xl" : "mt-4 text-[15px] leading-relaxed text-white/55"}>
                  {para}
                </p>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* SERVICES */}
      {services.length > 0 && (
        <section id="services" className="mx-auto max-w-6xl px-5 pt-20 md:px-8 md:pt-28">
          <motion.div {...rise()} className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <Pill>Services</Pill>
              <h2 className="mt-4 text-[30px] font-medium leading-[1.1] tracking-[-0.035em] md:text-4xl">Pick your cut</h2>
            </div>
            <p className="max-w-sm text-[13px] leading-relaxed text-white/45">Clear prices, no surprises. Book online in under a minute.</p>
          </motion.div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {featured.map((s, i) => {
              const hot = i === 1 || featured.length === 1;
              return (
                <motion.div key={s.id} {...rise(i * 0.07)} className="relative">
                  {hot && (
                    <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#FF2D46] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                      Most booked
                    </div>
                  )}
                  <Link
                    to={bookingUrl}
                    className={
                      "flex h-full flex-col rounded-[24px] p-5 transition active:scale-[0.98] " +
                      (hot ? "bg-white text-black" : "border border-white/[0.08] bg-white/[0.03] text-white")
                    }
                  >
                    <Scissors className={"h-5 w-5 " + (hot ? "text-[#FF2D46]" : "text-white/60")} />
                    <div className="mt-6 text-[16px] font-semibold">{s.name}</div>
                    <div className={"mt-0.5 text-[12px] " + (hot ? "text-black/50" : "text-white/45")}>{s.duration ? `${s.duration} min` : "Custom length"}</div>
                    <div className="mt-6 text-[34px] font-medium tracking-[-0.04em] tabular-nums">{price(s.price)}</div>
                    <div
                      className={
                        "mt-5 flex h-11 items-center justify-center gap-1 rounded-full text-[13px] font-semibold " +
                        (hot ? "bg-black text-white" : "bg-white text-black")
                      }
                    >
                      Book <ArrowUpRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          {rest.length > 0 && (
            <motion.ul {...rise(0.1)} className="mt-3 divide-y divide-white/[0.06] rounded-[24px] border border-white/[0.08] bg-white/[0.02] px-5">
              {rest.map((s) => (
                <li key={s.id}>
                  <Link to={bookingUrl} className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium">{s.name}</div>
                      <div className="text-[12px] text-white/45">{s.duration ? `${s.duration} min` : "Custom length"}</div>
                    </div>
                    <div className="shrink-0 text-[15px] font-semibold tabular-nums">{price(s.price)}</div>
                  </Link>
                </li>
              ))}
            </motion.ul>
          )}
        </section>
      )}

      {/* WORK */}
      <section id="work" className="mx-auto max-w-6xl px-5 pt-20 md:px-8 md:pt-28">
        <motion.div {...rise()}>
          <Pill>Work</Pill>
          <h2 className="mt-4 text-[30px] font-medium leading-[1.1] tracking-[-0.035em] md:text-4xl">{ownGallery.length ? "Fresh from the chair" : "The vibe"}</h2>
        </motion.div>
        <div className="mt-8 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
          {gallery.slice(0, 8).map((g, i) => (
            <motion.div
              key={g + i}
              {...rise((i % 4) * 0.06)}
              className={"overflow-hidden rounded-[22px] bg-white/[0.04] " + (i % 3 === 0 ? "aspect-[3/4]" : "aspect-square")}
            >
              <img src={g} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-[1200ms] hover:scale-105" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pt-20 md:px-8 md:pt-28">
          <motion.div {...rise()} className="flex items-end justify-between gap-4">
            <div>
              <Pill>Reviews</Pill>
              <h2 className="mt-4 text-[30px] font-medium leading-[1.1] tracking-[-0.035em] md:text-4xl">Trusted by regulars</h2>
            </div>
            <div className="flex items-center gap-1.5 text-[15px] font-semibold">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
              <span className="font-normal text-white/45">({reviewCount})</span>
            </div>
          </motion.div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {reviews.map((r, i) => (
              <motion.figure key={r.id} {...rise((i % 3) * 0.06)} className="rounded-[22px] bg-white p-5 text-black">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-3.5 w-3.5 text-amber-500" style={{ fill: s <= r.rating ? "currentColor" : "transparent" }} />
                  ))}
                </div>
                {r.comment && <blockquote className="mt-3 text-[14px] leading-relaxed text-black/80">“{r.comment}”</blockquote>}
                <figcaption className="mt-4 text-[12px] font-semibold text-black/50">{r.reviewer_name || "Verified client"}</figcaption>
              </motion.figure>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-3 pt-20 md:px-5 md:pt-28">
        <motion.div {...rise()} className="relative overflow-hidden rounded-[28px] md:rounded-[36px]">
          <img src={STOCK.cta} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative flex flex-col items-center px-6 py-16 text-center md:py-24">
            <h2 className="max-w-md text-[30px] font-medium leading-[1.1] tracking-[-0.035em] md:text-5xl">Your next cut is one tap away</h2>
            <p className="mt-3 max-w-sm text-[14px] text-white/70">Pick a time that suits you. You'll get a reminder before your appointment.</p>
            <Link to={bookingUrl} className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-black transition active:scale-95">
              <Calendar className="h-4 w-4" /> Book now
            </Link>
          </div>
        </motion.div>
      </section>

      {/* VISIT */}
      <section id="visit" className="mx-auto max-w-6xl px-5 pt-20 md:px-8 md:pt-28">
        <div className="grid gap-8 md:grid-cols-12">
          <motion.div {...rise()} className="md:col-span-5">
            <Pill>Visit</Pill>
            <h2 className="mt-4 text-[30px] font-medium leading-[1.1] tracking-[-0.035em] md:text-4xl">Come say hi</h2>
          </motion.div>
          <motion.div {...rise(0.08)} className="space-y-5 md:col-span-7">
            {address && (
              <InfoRow icon={MapPin} label="Address">
                <a href={`https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="hover:underline">{address}</a>
              </InfoRow>
            )}
            {m.hours && <InfoRow icon={Clock} label="Hours"><span className="whitespace-pre-line">{m.hours}</span></InfoRow>}
            {p.phone && <InfoRow icon={Phone} label="Phone"><a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a></InfoRow>}
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {socials.map(({ href, label, icon: Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.1] px-4 text-[13px] font-medium text-white/80 transition hover:bg-white/[0.06]">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* FOOTER — big wordmark over photo */}
      <footer className="relative mt-24 overflow-hidden pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-0">
        <img src={STOCK.footer} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0B0B0C_0%,rgba(11,11,12,0.6)_45%,rgba(11,11,12,0.2)_100%)]" />
        <div className="relative mx-auto max-w-6xl px-5 pt-10 md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[18px] font-semibold tracking-tight">{businessName}</div>
              <p className="mt-1 max-w-xs text-[13px] text-white/55">{tagline}</p>
            </div>
            <div className="flex gap-10 text-[13px] text-white/60">
              <div className="flex flex-col gap-1.5">
                <span className="text-white">Explore</span>
                {services.length > 0 && <a href="#services">Services</a>}
                <a href="#work">Work</a>
                <a href="#visit">Visit</a>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-white">Book</span>
                <Link to={bookingUrl}>Book online</Link>
                {p.phone && <a href={`tel:${p.phone}`}>Call</a>}
              </div>
            </div>
          </div>
          <div
            aria-hidden
            className="mt-10 select-none truncate text-center font-serif text-[22vw] font-medium leading-[0.8] tracking-[-0.06em] text-white/80 md:text-[160px]"
          >
            {businessName}
          </div>
          <div className="flex items-center justify-between border-t border-white/10 py-5 text-[12px] text-white/50">
            <span>© {new Date().getFullYear()} {businessName}</span>
            <a href="https://cutzioo.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
              Made with <span className="font-semibold text-white">Cutzioo</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-[linear-gradient(to_top,#0B0B0C_55%,transparent)] p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
        <Link to={bookingUrl} className="flex h-[54px] items-center justify-center gap-2 rounded-[18px] bg-white text-[16px] font-semibold text-black active:scale-[0.98]">
          <Calendar className="h-4 w-4" /> Book appointment
        </Link>
      </div>
    </div>
  );
};

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-black">{children}</span>
);

const InfoRow = ({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 border-b border-white/[0.06] pb-5">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#FF2D46]" />
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 text-[15px] text-white/85">{children}</div>
    </div>
  </div>
);

export default Microsite;

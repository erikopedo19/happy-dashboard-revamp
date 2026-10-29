import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, MapPin, Clock, Phone, Star, Calendar, Globe, Music2, MessageCircle, Scissors, Check, Bell, Sparkles, Users } from "lucide-react";

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
  how: IMG("1622286342621-4bd786c2447c", 1200),
  reviews: IMG("1621605815971-fbc98d665033", 1200),
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

const STEPS = [
  { title: "Pick your service", body: "Fades, beard work, kids cuts — clear prices up front.", tint: "#FF2D46" },
  { title: "Choose a time", body: "See live availability and grab the slot that suits you.", tint: "#38BDF8" },
  { title: "Get a reminder", body: "We'll nudge you before your appointment, no app needed.", tint: "#A78BFA" },
  { title: "Walk in fresh", body: "Sit down, relax and leave looking sharper than you came.", tint: "#34D399" },
];
const TINTS = ["#38BDF8", "#FF2D46", "#A78BFA"];

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
  const accent: string = /^#[0-9a-f]{6}$/i.test(p.brand_color || "") && p.brand_color.toUpperCase() !== "#0A84FF" ? p.brand_color : "#FF2D46";
  const stats = [
    { icon: Star, value: rating.toFixed(1), label: "Average rating", tint: "#FBBF24" },
    { icon: Users, value: reviewCount ? `${reviewCount}+` : "New", label: "Happy clients", tint: accent },
    { icon: Scissors, value: String(services.length || "—"), label: "Services", tint: "#38BDF8" },
    { icon: Calendar, value: "24/7", label: "Online booking", tint: "#34D399" },
  ];
  const [topReview, ...moreReviews] = reviews;
  const sampleService = services[0];
  const featured = services.slice(0, 3);
  const rest = services.slice(3);
  const price = (v: number | null) => `$${Number(v || 0).toFixed(0)}`;

  return (
    <div
      className="min-h-screen overflow-x-clip bg-[#0B0B0C] text-white antialiased"
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

      {/* STATS */}
      <section className="mx-auto max-w-6xl px-5 pt-6 md:px-8 md:pt-10">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
          {stats.map(({ icon: Icon, value, label, tint }, i) => (
            <motion.div key={label} {...rise(i * 0.05)} className="flex items-center gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-3.5 md:p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]" style={{ background: `${tint}1f`, color: tint }}>
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="text-[17px] font-semibold tabular-nums leading-tight">{value}</div>
                <div className="truncate text-[11px] text-white/45">{label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      {about && (
        <section id="about" className="mx-auto max-w-6xl px-5 pt-20 md:px-8 md:pt-28">
          <div className="grid gap-6 md:grid-cols-12 md:gap-12">
            <motion.div {...rise()} className="md:col-span-4">
              <Pill dot={accent}>About</Pill>
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

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-5 pt-20 md:px-8 md:pt-28">
        <motion.div {...rise()} className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Pill dot={accent}>How it works</Pill>
            <h2 className="mt-4 max-w-md text-[30px] font-medium leading-[1.1] tracking-[-0.035em] md:text-4xl">Booked in four simple steps</h2>
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed text-white/45">No calls, no waiting. Choose, book and get reminded — all from your phone.</p>
        </motion.div>
        <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-2 md:items-center md:gap-12">
          <ol>
            {STEPS.map((st, i) => (
              <motion.li key={st.title} {...rise(i * 0.06)} className="flex gap-4 border-b border-dashed border-white/10 py-4 last:border-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[12px] font-bold tabular-nums" style={{ background: `${st.tint}1f`, color: st.tint }}>
                  0{i + 1}
                </div>
                <div>
                  <div className="text-[15px] font-semibold">{st.title}</div>
                  <div className="mt-0.5 text-[13px] leading-relaxed text-white/50">{st.body}</div>
                </div>
              </motion.li>
            ))}
          </ol>
          <motion.div {...rise(0.1)} className="relative aspect-[4/5] overflow-hidden rounded-[26px] md:aspect-[4/3]">
            <img src={STOCK.how} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${accent}40 0%, transparent 45%, rgba(0,0,0,0.65) 100%)` }} />
            <div className="absolute inset-x-3 bottom-3 rounded-[20px] border border-white/15 bg-[#141416]/85 p-4 backdrop-blur-xl md:inset-x-auto md:right-4 md:bottom-4 md:w-[290px]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-white/60">Booking details</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <Check className="h-3 w-3" /> Confirmed
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ background: accent }}>A</div>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold">Alex M.</div>
                  <div className="truncate text-[12px] text-white/50">{sampleService?.name || "Classic cut"}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                {[
                  ["Day", "Tomorrow"],
                  ["Time", "10:30"],
                  ["Price", sampleService ? price(sampleService.price) : "$20"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[12px] bg-white/[0.06] px-2 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-white/40">{k}</div>
                    <div className="mt-0.5 text-[13px] font-semibold">{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-2 rounded-[12px] bg-white/[0.04] px-3 py-2 text-[12px] text-white/60">
                <Bell className="h-3.5 w-3.5" style={{ color: accent }} /> Reminder set for 9:30
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SERVICES */}
      {services.length > 0 && (
        <section id="services" className="relative mx-auto max-w-6xl px-5 pt-20 md:px-8 md:pt-28">
          <div aria-hidden className="pointer-events-none absolute -inset-x-20 top-24 -z-0 h-[420px]" style={{ background: `radial-gradient(50% 50% at 30% 50%, ${accent}26, transparent 70%), radial-gradient(40% 50% at 80% 60%, #38BDF81a, transparent 70%)` }} />
          <motion.div {...rise()} className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <Pill dot={accent}>Services</Pill>
              <h2 className="mt-4 text-[30px] font-medium leading-[1.1] tracking-[-0.035em] md:text-4xl">Pick your cut</h2>
            </div>
            <p className="max-w-sm text-[13px] leading-relaxed text-white/45">Clear prices, no surprises. Book online in under a minute.</p>
          </motion.div>
          <div className="relative mt-8 grid gap-3 md:grid-cols-3">
            {featured.map((s, i) => {
              const hot = i === 1 || featured.length === 1;
              return (
                <motion.div key={s.id} {...rise(i * 0.07)} className="relative">
                  {hot && (
                    <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white" style={{ background: accent }}>
                      Most booked
                    </div>
                  )}
                  <Link
                    to={bookingUrl}
                    className={
                      "flex h-full flex-col rounded-[24px] p-5 transition active:scale-[0.98] " +
                      (hot ? "bg-white text-black" : "border border-white/[0.08] bg-[#121214] text-white")
                    }
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-[13px]" style={{ background: `${hot ? accent : TINTS[i % 3]}1f`, color: hot ? accent : TINTS[i % 3] }}>
                      {hot ? <Sparkles className="h-[18px] w-[18px]" /> : <Scissors className="h-[18px] w-[18px]" />}
                    </div>
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
          <Pill dot={accent}>Work</Pill>
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
              <Pill dot={accent}>Reviews</Pill>
              <h2 className="mt-4 text-[30px] font-medium leading-[1.1] tracking-[-0.035em] md:text-4xl">Trusted by regulars</h2>
            </div>
            <div className="flex items-center gap-1.5 text-[15px] font-semibold">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
              <span className="font-normal text-white/45">({reviewCount})</span>
            </div>
          </motion.div>
          <div className="mt-8 grid gap-3 md:grid-cols-12">
            {topReview && (
              <motion.figure {...rise()} className={"flex flex-col justify-between rounded-[26px] border border-white/[0.08] bg-[#121214] p-6 " + (moreReviews.length ? "md:col-span-5" : "md:col-span-12")}>
                <div>
                  <Stars n={topReview.rating} />
                  {topReview.comment && <blockquote className="mt-4 text-[21px] font-medium leading-[1.35] tracking-[-0.02em] text-white md:text-[24px]">“{topReview.comment}”</blockquote>}
                </div>
                <figcaption className="mt-8 flex items-center gap-3">
                  <Avatar name={topReview.reviewer_name} color={accent} />
                  <div>
                    <div className="text-[13px] font-semibold">{topReview.reviewer_name || "Verified client"}</div>
                    <div className="text-[11px] text-white/45">Verified client</div>
                  </div>
                </figcaption>
              </motion.figure>
            )}
            {moreReviews.length > 0 && (
              <motion.div {...rise(0.08)} className="relative overflow-hidden rounded-[26px] p-3 md:col-span-7 md:p-4">
                <img src={STOCK.reviews} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/30" />
                <div className="relative grid gap-2.5 sm:grid-cols-2">
                  {moreReviews.map((r, i) => (
                    <figure key={r.id} className="rounded-[18px] bg-white p-4 text-black">
                      <figcaption className="flex items-center gap-2.5">
                        <Avatar name={r.reviewer_name} color={TINTS[i % 3]} small />
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold">{r.reviewer_name || "Verified client"}</div>
                          <Stars n={r.rating} small />
                        </div>
                      </figcaption>
                      {r.comment && <blockquote className="mt-2.5 text-[13px] leading-relaxed text-black/70">{r.comment}</blockquote>}
                    </figure>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-3 pt-20 md:px-5 md:pt-28">
        <motion.div {...rise()} className="relative overflow-hidden rounded-[28px] md:rounded-[36px]">
          <img src={STOCK.cta} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}66 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.7) 100%)` }} />
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
            <Pill dot={accent}>Visit</Pill>
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

const Pill = ({ children, dot }: { children: React.ReactNode; dot?: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-black">
    {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
    {children}
  </span>
);

const Stars = ({ n, small }: { n: number; small?: boolean }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={(small ? "h-3 w-3" : "h-4 w-4") + " text-amber-400"} style={{ fill: s <= n ? "currentColor" : "transparent" }} />
    ))}
  </div>
);

const Avatar = ({ name, color, small }: { name: string | null; color: string; small?: boolean }) => (
  <div
    className={"flex shrink-0 items-center justify-center rounded-full font-bold text-white " + (small ? "h-8 w-8 text-[12px]" : "h-10 w-10 text-[14px]")}
    style={{ background: color }}
  >
    {(name || "V").trim().slice(0, 1).toUpperCase()}
  </div>
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

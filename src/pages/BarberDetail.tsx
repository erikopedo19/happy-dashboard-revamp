import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { addDays, format, startOfDay } from "date-fns";
import {
  ArrowLeft, Share2, Heart, Star, MapPin, Phone, Instagram, Globe, Clock, Search,
  MessageCircle, Scissors, ChevronRight, Navigation, Check, Link2, Sparkles, BadgeCheck, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { dateStrInTz, getBrowserTimezone, minutesInTz, timeStrToMinutes } from "@/lib/tz";
import { generateBookingTimeSlots, getAvailableBookingSlots } from "@/lib/bookingSlots";
import { QuickBookSheet } from "@/components/QuickBookSheet";
import { Seo, SITE } from "@/components/Seo";

const ACCENT = "#FF2D46";
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Service { id: string; name: string; price: number; duration: number }
interface Review { id: string; rating: number; comment: string | null; reviewer_name: string | null; created_at: string }
interface SiteData {
  profile: {
    id: string; business_name: string | null; full_name: string | null; booking_link: string | null;
    brand_color: string | null; avatar_url: string | null; banner_url: string | null; address: string | null;
    phone: string | null; description: string | null; rating: number | null; rating_count: number | null;
    show_public_reviews: boolean | null;
  };
  microsite: {
    about: string | null; address: string | null; gallery: unknown; hero_url: string | null; hours: string | null;
    instagram: string | null; website_url: string | null; whatsapp: string | null; tagline: string | null;
    headline: string | null; published: boolean; facebook: string | null; tiktok: string | null;
  } | null;
  services: Service[];
  reviews: Review[];
}
interface AgendaSettings { start_hour: string; end_hour: string; service_duration: number; working_days?: number[] | null; timezone?: string | null }

const FAV_KEY = "favoriteBarbers";
const readFavs = (): string[] => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; } };

const toHref = (v: string, kind: "instagram" | "web" | "whatsapp" | "tel") => {
  const t = v.trim();
  if (kind === "instagram") return /^https?:/i.test(t) ? t : `https://instagram.com/${t.replace(/^@/, "")}`;
  if (kind === "whatsapp") return /^https?:/i.test(t) ? t : `https://wa.me/${t.replace(/[^\d]/g, "")}`;
  if (kind === "tel") return `tel:${t.replace(/\s+/g, "")}`;
  return /^https?:/i.test(t) ? t : `https://${t}`;
};

const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** "Street 1, 10431 Athens, Greece" → "Athens". Best effort for titles. */
const cityFrom = (address?: string | null) => {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.replace(/\d+/g, "").trim()).filter(Boolean);
  if (!parts.length) return null;
  return parts.length >= 3 ? parts[parts.length - 2] : parts[parts.length - 1];
};

function openStatus(s: AgendaSettings | undefined) {
  if (!s) return null;
  const tz = s.timezone || getBrowserTimezone();
  const days = s.working_days ?? [0, 1, 2, 3, 4, 5, 6];
  const dow = new Date(`${dateStrInTz(new Date(), tz)}T00:00:00`).getDay();
  const now = minutesInTz(new Date(), tz);
  const open = timeStrToMinutes(s.start_hour.slice(0, 5));
  const close = timeStrToMinutes(s.end_hour.slice(0, 5));
  if (days.includes(dow) && now >= open && now < close) return { open: true, label: `Open · until ${fmtTime(s.end_hour)}` };
  for (let i = 0; i < 8; i++) {
    const d = (dow + i) % 7;
    if (!days.includes(d) || (i === 0 && now >= open)) continue;
    const when = i === 0 ? "" : i === 1 ? "tomorrow " : `${DAYS[d].slice(0, 3)} `;
    return { open: false, label: `Closed · opens ${when}${fmtTime(s.start_hour)}` };
  }
  return { open: false, label: "Closed" };
}

export default function BarberDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();
  const seed = (location.state || {}) as { name?: string; avatar_url?: string | null; banner_url?: string | null; rating?: number | null; rating_count?: number | null };

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const heroY = useTransform(scrollY, [0, 320], [0, reduce ? 0 : 110]);
  const heroScale = useTransform(scrollY, [-200, 0], [reduce ? 1 : 1.35, 1]);
  const barOpacity = useTransform(scrollY, [200, 260], [0, 1]);
  const barPointer = useTransform(scrollY, (v) => (v > 220 ? "auto" : "none"));

  const [favs, setFavs] = useState<string[]>(readFavs);
  const [serviceId, setServiceId] = useState("");
  const [query, setQuery] = useState("");
  const [bookOpen, setBookOpen] = useState(false);
  const [bookAt, setBookAt] = useState<{ date: Date; time?: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState("services");

  const { data, isLoading, isError } = useQuery<SiteData | null>({
    queryKey: ["barber-detail", slug],
    enabled: !!slug,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_microsite_by_slug", { _slug: slug });
      if (error || !data?.profile) return null;
      return data as SiteData;
    },
  });

  const profile = data?.profile;
  const site = data?.microsite;
  const barberId = profile?.id || "";
  const name = profile?.business_name || profile?.full_name || seed.name || "Barber";
  const rating = Number(profile?.rating ?? seed.rating ?? 5);
  const ratingCount = profile?.rating_count ?? seed.rating_count ?? 0;
  const banner = profile?.banner_url || site?.hero_url || seed.banner_url || null;
  const avatar = profile?.avatar_url || seed.avatar_url || null;
  const address = profile?.address || site?.address || null;
  const city = cityFrom(address);
  const gallery: string[] = useMemo(
    () => (Array.isArray(site?.gallery) ? (site!.gallery as unknown[]).filter((g): g is string => typeof g === "string" && !!g) : []),
    [site],
  );
  const services = useMemo(() => data?.services ?? [], [data]);
  const reviews = data?.reviews ?? [];
  const isFav = favs.includes(barberId);
  const minPrice = services.length ? Math.min(...services.map((s) => Number(s.price))) : null;
  const maxPrice = services.length ? Math.max(...services.map((s) => Number(s.price))) : null;
  const about = site?.about || profile?.description || null;

  useEffect(() => { if (services.length && !serviceId) setServiceId(services[0].id); }, [services, serviceId]);
  const selectedService = services.find((s) => s.id === serviceId);
  const filteredServices = query.trim()
    ? services.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
    : services;

  const { data: settings } = useQuery<AgendaSettings>({
    queryKey: ["quickbook-settings", barberId],
    enabled: !!barberId,
    queryFn: async () => {
      const [agendaRes, profileRes] = await Promise.all([
        (supabase as any).rpc("get_public_agenda_settings", { _user_id: barberId }),
        (supabase as any).from("profiles").select("timezone").eq("id", barberId).maybeSingle(),
      ]);
      const base = (Array.isArray(agendaRes?.data) ? agendaRes.data[0] : agendaRes?.data) || {
        start_hour: "09:00", end_hour: "18:00", service_duration: 30, working_days: [0, 1, 2, 3, 4, 5, 6],
      };
      return { ...base, timezone: profileRes?.data?.timezone || null } as AgendaSettings;
    },
  });
  const workingDays = settings?.working_days ?? [0, 1, 2, 3, 4, 5, 6];
  const status = useMemo(() => openStatus(settings), [settings]);

  // First day (within two weeks) that still has free slots for the selected service.
  const duration = selectedService?.duration || settings?.service_duration || 30;
  const { data: nextSlots, isLoading: slotsLoading } = useQuery<{ date: Date; slots: string[] } | null>({
    queryKey: ["barber-next-slots", barberId, duration],
    enabled: !!barberId && !!settings,
    staleTime: 30_000,
    queryFn: async () => {
      const s = settings!;
      const { data: off } = await (supabase as any).rpc("get_time_off_dates", { _user_id: barberId });
      const offSet = new Set<string>((off || []).map((r: any) => r.off_date as string));
      const all = generateBookingTimeSlots(s.start_hour, s.end_hour, s.service_duration);
      let checked = 0;
      for (let i = 0; i < 14 && checked < 7; i++) {
        const d = addDays(startOfDay(new Date()), i);
        if (!workingDays.includes(d.getDay()) || offSet.has(format(d, "yyyy-MM-dd"))) continue;
        checked += 1;
        const { data: booked } = await (supabase as any).rpc("get_booked_slots", { _business_id: barberId, _date: format(d, "yyyy-MM-dd") });
        const slots = getAvailableBookingSlots({
          date: d, allSlots: all, startHour: s.start_hour, endHour: s.end_hour, interval: s.service_duration,
          serviceDuration: duration, bookedSlots: booked || [], workingDays, timezone: s.timezone, timeOffDates: offSet,
        });
        if (slots.length) return { date: d, slots };
      }
      return null;
    },
  });

  const sections = [
    services.length > 0 && { id: "services", label: "Services" },
    gallery.length > 0 && { id: "photos", label: "Photos" },
    { id: "reviews", label: "Reviews" },
    { id: "info", label: "Info" },
  ].filter(Boolean) as { id: string; label: string }[];

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !data) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActiveSection(e.target.id)),
      { root, rootMargin: "-40% 0px -55% 0px" },
    );
    sections.forEach((s) => { const el = root.querySelector(`#${s.id}`); if (el) io.observe(el); });
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, gallery.length, services.length]);

  const jumpTo = (id: string) => {
    haptic("selection");
    const root = scrollRef.current;
    const el = root?.querySelector<HTMLElement>(`#${id}`);
    if (root && el) root.scrollTo({ top: el.offsetTop - 110, behavior: reduce ? "auto" : "smooth" });
  };

  const toggleFav = () => {
    if (!barberId) return;
    haptic(isFav ? "light" : "success");
    const next = isFav ? favs.filter((x) => x !== barberId) : [...favs, barberId];
    setFavs(next);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
  };

  const shareUrl = `${SITE}/b/${slug}`;
  const share = async () => {
    haptic("light");
    try {
      if (navigator.share) await navigator.share({ title: `${name} on Cutzioo`, text: `Book ${name} online — I go here for my cuts.`, url: shareUrl });
      else await copyLink();
    } catch {}
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      haptic("success");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const openBooking = (date?: Date, time?: string) => {
    haptic("medium");
    setBookAt({ date: date || nextSlots?.date || new Date(), time });
    setBookOpen(true);
  };

  const links = [
    site?.instagram && { icon: Instagram, label: "Instagram", value: site.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "@").replace(/\/$/, ""), href: toHref(site.instagram, "instagram") },
    site?.published && profile?.booking_link && { icon: Globe, label: "Website", value: `cutzioo.com/site/${profile.booking_link}`, href: `/site/${profile.booking_link}`, internal: true },
    !site?.published && site?.website_url && { icon: Globe, label: "Website", value: site.website_url.replace(/^https?:\/\//, ""), href: toHref(site.website_url, "web") },
    site?.whatsapp && { icon: MessageCircle, label: "WhatsApp", value: site.whatsapp, href: toHref(site.whatsapp, "whatsapp") },
    profile?.phone && { icon: Phone, label: "Call", value: profile.phone, href: toHref(profile.phone, "tel") },
    address && { icon: MapPin, label: "Address", value: address, href: `https://maps.google.com/?q=${encodeURIComponent(address)}` },
  ].filter(Boolean) as { icon: typeof Instagram; label: string; value: string; href: string; internal?: boolean }[];

  const quickActions = [
    profile?.phone && { icon: Phone, label: "Call", href: toHref(profile.phone, "tel") },
    address && { icon: Navigation, label: "Directions", href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` },
    site?.whatsapp && { icon: MessageCircle, label: "Message", href: toHref(site.whatsapp, "whatsapp") },
    site?.instagram && { icon: Instagram, label: "Instagram", href: toHref(site.instagram, "instagram") },
  ].filter(Boolean) as { icon: typeof Phone; label: string; href: string }[];

  const distribution = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));

  // ---------- SEO ----------
  const pageTitle = `${name}${city ? ` – Barber in ${city}` : " – Barber"} | Book Online | Cutzioo`;
  const serviceNames = services.slice(0, 4).map((s) => s.name.toLowerCase()).join(", ");
  const pageDesc = [
    `Book ${name}${city ? ` in ${city}` : ""} online.`,
    ratingCount > 0 ? `Rated ${rating.toFixed(1)}★ by ${ratingCount} clients.` : null,
    minPrice != null ? `${serviceNames ? `${serviceNames[0].toUpperCase()}${serviceNames.slice(1)}` : "Services"} from €${minPrice.toFixed(0)}.` : null,
    "See prices, photos and free times, then book in seconds on Cutzioo.",
  ].filter(Boolean).join(" ");
  const jsonLd = useMemo(() => {
    if (!profile) return undefined;
    const business: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "HairSalon",
      "@id": `${shareUrl}#business`,
      name,
      url: shareUrl,
      description: about || pageDesc,
      image: [banner, avatar, ...gallery.slice(0, 5)].filter(Boolean),
      ...(profile.phone && { telephone: profile.phone }),
      ...(address && { address: { "@type": "PostalAddress", streetAddress: address, ...(city && { addressLocality: city }) } }),
      ...(minPrice != null && { priceRange: `€${minPrice.toFixed(0)}–€${(maxPrice ?? minPrice).toFixed(0)}`, currenciesAccepted: "EUR" }),
      ...(ratingCount > 0 && { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: ratingCount, bestRating: 5, worstRating: 1 } }),
      ...(reviews.length > 0 && {
        review: reviews.slice(0, 5).map((r) => ({
          "@type": "Review",
          author: { "@type": "Person", name: r.reviewer_name || "Client" },
          datePublished: r.created_at.slice(0, 10),
          reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
          ...(r.comment && { reviewBody: r.comment }),
        })),
      }),
      ...(services.length > 0 && {
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Services",
          itemListElement: services.map((s) => ({
            "@type": "Offer",
            price: Number(s.price).toFixed(2),
            priceCurrency: "EUR",
            itemOffered: { "@type": "Service", name: s.name, serviceType: "Barber" },
          })),
        },
      }),
      ...(settings && {
        openingHoursSpecification: [{
          "@type": "OpeningHoursSpecification",
          dayOfWeek: workingDays.map((d) => DAYS[d]),
          opens: fmtTime(settings.start_hour),
          closes: fmtTime(settings.end_hour),
        }],
      }),
      ...(site?.instagram && { sameAs: [toHref(site.instagram, "instagram")] }),
      potentialAction: {
        "@type": "ReserveAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE}/book/${profile.booking_link || slug}`, inLanguage: "en", actionPlatform: ["https://schema.org/DesktopWebPlatform", "https://schema.org/MobileWebPlatform"] },
        result: { "@type": "Reservation", name: `Appointment at ${name}` },
      },
    };
    const breadcrumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Cutzioo", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Find a barber", item: `${SITE}/find-barber` },
        { "@type": "ListItem", position: 3, name, item: shareUrl },
      ],
    };
    return [business, breadcrumbs];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, services, reviews, settings, site, gallery]);

  if (!isLoading && (isError || data === null)) {
    return (
      <div className="h-[100dvh] bg-[#0A0A0C] text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Seo title="Barber not found | Cutzioo" description="This barber page isn't available." path={`/b/${slug}`} noindex />
        <Scissors className="h-10 w-10 text-white/30" />
        <p className="text-[17px] font-semibold">This barber isn't available</p>
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="rounded-full bg-white/10 px-5 py-2.5 text-[14px] font-semibold transition-transform duration-150 active:scale-[0.97]">Go back</button>
          <Link to="/find-barber" className="rounded-full px-5 py-2.5 text-[14px] font-semibold transition-transform duration-150 active:scale-[0.97]" style={{ backgroundColor: ACCENT }}>Find another barber</Link>
        </div>
      </div>
    );
  }

  const rise = (i: number) => ({
    initial: { opacity: 0, transform: reduce ? "none" : "translateY(10px)" },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: { duration: 0.32, ease: EASE_OUT, delay: 0.06 + i * 0.04 },
  });

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#0A0A0C] text-white">
      <Seo title={pageTitle} description={pageDesc} path={`/b/${slug}`} image={banner || avatar} type="business.business" jsonLd={jsonLd} />

      {/* Compact bar — fades in once the hero scrolls away */}
      <motion.div
        style={{ opacity: barOpacity, pointerEvents: barPointer as any }}
        className="absolute inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#0A0A0C]/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
      >
        <div className="flex h-12 items-center gap-3 px-3">
          <IconBtn label="Back" onClick={() => { haptic("light"); navigate(-1); }}><ArrowLeft className="h-[18px] w-[18px]" /></IconBtn>
          <p className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold">{name}</p>
          <IconBtn label="Share" onClick={share}><Share2 className="h-4 w-4" /></IconBtn>
        </div>
        <nav aria-label="Sections" className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((s) => (
            <button key={s.id} type="button" onClick={() => jumpTo(s.id)} className={cn("relative shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-150", activeSection === s.id ? "text-white" : "text-white/50")}>
              {activeSection === s.id && <motion.span layoutId="barber-nav-pill" transition={{ type: "spring", duration: 0.3, bounce: 0 }} className="absolute inset-0 rounded-full bg-white/[0.12]" />}
              <span className="relative">{s.label}</span>
            </button>
          ))}
        </nav>
      </motion.div>

      <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Hero */}
        <header className="relative h-[46vh] min-h-[320px] w-full overflow-hidden">
          <motion.div style={{ y: heroY, scale: heroScale }} className="absolute inset-0 origin-bottom">
            {banner ? (
              <motion.img
                initial={{ opacity: 0, transform: reduce ? "none" : "scale(1.06)" }}
                animate={{ opacity: 1, transform: "scale(1)" }}
                transition={{ duration: 0.7, ease: EASE_OUT }}
                src={banner}
                alt={`${name} barbershop`}
                {...{ fetchpriority: "high" }}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="relative h-full w-full" style={{ background: `radial-gradient(120% 90% at 80% 10%, ${ACCENT} 0%, #3a0a12 55%, #0A0A0C 100%)` }}>
                <Scissors className="absolute right-6 top-1/4 h-40 w-40 -rotate-12 text-white/10" />
              </div>
            )}
          </motion.div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/5 to-[#0A0A0C]" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <IconBtn glass label="Back" onClick={() => { haptic("light"); navigate(-1); }}><ArrowLeft className="h-5 w-5" /></IconBtn>
            <div className="flex gap-2">
              <IconBtn glass label="Share" onClick={share}><Share2 className="h-[18px] w-[18px]" /></IconBtn>
              <IconBtn glass label={isFav ? "Remove from favorites" : "Add to favorites"} onClick={toggleFav}>
                <motion.span key={String(isFav)} initial={{ transform: "scale(0.7)" }} animate={{ transform: "scale(1)" }} transition={{ type: "spring", duration: 0.35, bounce: 0.3 }}>
                  <Heart className={cn("h-[18px] w-[18px] transition-colors duration-150", isFav && "fill-[#FF2D46] text-[#FF2D46]")} />
                </motion.span>
              </IconBtn>
            </div>
          </div>
        </header>

        <main className="relative -mt-16 px-5 pb-44">
          {/* Identity */}
          <motion.div {...rise(0)} className="flex items-end gap-4">
            <div className="relative shrink-0">
              {avatar ? (
                <img src={avatar} alt={`${name} logo`} className="h-[84px] w-[84px] rounded-[26px] object-cover ring-4 ring-[#0A0A0C]" />
              ) : (
                <div className="flex h-[84px] w-[84px] items-center justify-center rounded-[26px] text-[30px] font-bold ring-4 ring-[#0A0A0C]" style={{ backgroundColor: ACCENT }}>{name.slice(0, 1)}</div>
              )}
              {ratingCount >= 5 && rating >= 4.5 && (
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#0A0A0C]" title="Top rated">
                  <BadgeCheck className="h-5 w-5" style={{ color: ACCENT }} />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              {status && (
                <span className={cn("mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", status.open ? "bg-[#30D158]/15 text-[#30D158]" : "bg-white/[0.08] text-white/60")}>
                  <span className="relative flex h-1.5 w-1.5">
                    {status.open && !reduce && <span className="absolute inset-0 animate-ping rounded-full bg-[#30D158] opacity-60" />}
                    <span className={cn("relative h-1.5 w-1.5 rounded-full", status.open ? "bg-[#30D158]" : "bg-white/40")} />
                  </span>
                  {status.label}
                </span>
              )}
            </div>
          </motion.div>

          <motion.div {...rise(1)} className="mt-3">
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em]">
              {isLoading && !seed.name ? <span className="inline-block h-7 w-48 animate-pulse rounded-lg bg-white/10" /> : name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-white/55">
              {(site?.tagline || site?.headline) && <span className="font-medium" style={{ color: ACCENT }}>{site?.tagline || site?.headline}</span>}
              {city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Barber in {city}</span>}
            </p>
          </motion.div>

          {/* Stats strip */}
          <motion.div {...rise(2)} className="mt-5 grid grid-cols-3 divide-x divide-white/[0.06] rounded-[22px] bg-white/[0.04] ring-1 ring-white/[0.05]">
            <Stat value={<span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-[#FFCC00] text-[#FFCC00]" />{rating.toFixed(1)}</span>} label={`${ratingCount} ${ratingCount === 1 ? "review" : "reviews"}`} onClick={() => jumpTo("reviews")} />
            <Stat value={services.length || "—"} label="Services" onClick={() => jumpTo("services")} />
            <Stat value={minPrice != null ? `€${minPrice.toFixed(0)}` : "—"} label="Starting at" onClick={() => jumpTo("services")} />
          </motion.div>

          {/* Quick actions */}
          {quickActions.length > 0 && (
            <motion.div {...rise(3)} className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${quickActions.length}, minmax(0, 1fr))` }}>
              {quickActions.map(({ icon: Icon, label, href }) => (
                <a key={label} href={href} target={href.startsWith("tel:") ? undefined : "_blank"} rel="noreferrer" onClick={() => haptic("light")}
                  className="flex flex-col items-center gap-1.5 rounded-[18px] bg-white/[0.04] py-3 text-[11.5px] font-medium text-white/70 ring-1 ring-white/[0.05] transition-transform duration-150 ease-out active:scale-[0.97]">
                  <Icon className="h-[18px] w-[18px]" style={{ color: ACCENT }} />{label}
                </a>
              ))}
            </motion.div>
          )}

          {/* Next available */}
          <motion.section {...rise(4)} aria-label="Next available times" className="mt-6 overflow-hidden rounded-[24px] p-4 ring-1 ring-white/[0.06]" style={{ background: `linear-gradient(135deg, ${ACCENT}26 0%, rgba(255,255,255,0.03) 60%)` }}>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[15px] font-semibold"><Zap className="h-4 w-4" style={{ color: ACCENT }} />Next available</p>
              {nextSlots && <span className="text-[12.5px] font-medium text-white/60">{format(nextSlots.date, "EEE, MMM d")}</span>}
            </div>
            <div className="mt-3 flex min-h-[38px] gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {slotsLoading || !settings ? (
                [0, 1, 2, 3, 4].map((i) => <span key={i} className="h-[38px] w-[68px] shrink-0 animate-pulse rounded-full bg-white/[0.07]" />)
              ) : nextSlots ? (
                <>
                  {nextSlots.slots.slice(0, 8).map((t, i) => (
                    <motion.button key={t} type="button" onClick={() => openBooking(nextSlots.date, t)}
                      initial={{ opacity: 0, transform: reduce ? "none" : "translateX(8px)" }} animate={{ opacity: 1, transform: "translateX(0px)" }} transition={{ duration: 0.25, ease: EASE_OUT, delay: i * 0.03 }}
                      className="h-[38px] shrink-0 rounded-full bg-white/[0.1] px-4 text-[14px] font-semibold tabular-nums transition-transform duration-150 ease-out active:scale-[0.97]">
                      {t}
                    </motion.button>
                  ))}
                  <button type="button" onClick={() => openBooking()} className="h-[38px] shrink-0 rounded-full px-4 text-[13px] font-semibold text-white/70 ring-1 ring-white/15 transition-transform duration-150 active:scale-[0.97]">More times</button>
                </>
              ) : (
                <p className="text-[13px] text-white/50">Fully booked for the next days — check back soon.</p>
              )}
            </div>
          </motion.section>

          {/* Services */}
          {services.length > 0 && (
            <Section id="services" title="Services" aside={`${services.length}`}>
              {services.length > 6 && (
                <label className="mb-3 flex h-11 items-center gap-2 rounded-[14px] bg-white/[0.05] px-3.5 ring-1 ring-white/[0.05] focus-within:ring-white/20">
                  <Search className="h-4 w-4 text-white/40" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services" className="h-full flex-1 bg-transparent text-[16px] outline-none placeholder:text-white/35" />
                </label>
              )}
              <ul className="overflow-hidden rounded-[22px] bg-white/[0.04] ring-1 ring-white/[0.05]">
                {filteredServices.map((sv, i) => {
                  const active = sv.id === serviceId;
                  return (
                    <li key={sv.id} className={cn(i > 0 && "border-t border-white/[0.05]")}>
                      <button type="button" onClick={() => { haptic("selection"); setServiceId(sv.id); }}
                        className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150", active && "bg-white/[0.04]")}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{sv.name}</span>
                          <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-white/45"><Clock className="h-3 w-3" />{sv.duration} min</span>
                        </span>
                        <span className="text-[15px] font-semibold tabular-nums">€{Number(sv.price).toFixed(0)}</span>
                        <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-150", active ? "border-transparent" : "border-white/20")} style={active ? { backgroundColor: ACCENT } : undefined}>
                          <Check className={cn("h-3.5 w-3.5 transition-[opacity,transform] duration-150 ease-out", active ? "scale-100 opacity-100" : "scale-75 opacity-0")} strokeWidth={3} />
                        </span>
                      </button>
                    </li>
                  );
                })}
                {filteredServices.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-white/40">No services match "{query}"</li>}
              </ul>
            </Section>
          )}

          {/* Photos */}
          {gallery.length > 0 && (
            <Section id="photos" title="Photos" aside={`${gallery.length}`}>
              <div className="grid grid-cols-3 gap-1.5">
                {gallery.slice(0, 9).map((g, i) => (
                  <button key={g} type="button" onClick={() => { haptic("light"); setLightbox(g); }} className={cn("overflow-hidden rounded-xl bg-white/[0.05] transition-transform duration-150 ease-out active:scale-[0.98]", i === 0 && "col-span-2 row-span-2")}>
                    <img src={g} alt={`${name} haircut ${i + 1}`} loading="lazy" className="aspect-square h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Reviews */}
          <Section id="reviews" title="Reviews" aside={ratingCount ? `${ratingCount}` : undefined}>
            <div className="flex items-center gap-5 rounded-[22px] bg-white/[0.04] p-4 ring-1 ring-white/[0.05]">
              <div className="shrink-0 text-center">
                <p className="text-[46px] font-bold leading-none tracking-tight tabular-nums">{rating.toFixed(1)}</p>
                <div className="mt-1.5 flex justify-center gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("h-3.5 w-3.5", i <= Math.round(rating) ? "fill-[#FFCC00] text-[#FFCC00]" : "text-white/15")} />)}</div>
                <p className="mt-1 text-[11.5px] text-white/45">{ratingCount} {ratingCount === 1 ? "review" : "reviews"}</p>
              </div>
              {reviews.length > 0 && (
                <div className="flex-1 space-y-1.5">
                  {distribution.map(({ s, n }, i) => (
                    <div key={s} className="flex items-center gap-2 text-[11px]">
                      <span className="w-2.5 text-white/45">{s}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                        <motion.div
                          initial={{ transform: "scaleX(0)" }} whileInView={{ transform: `scaleX(${n / reviews.length})` }} viewport={{ once: true }}
                          transition={{ duration: 0.6, ease: EASE_OUT, delay: i * 0.05 }}
                          className="h-full origin-left rounded-full bg-[#FFCC00]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 space-y-2.5">
              {reviews.length > 0 ? reviews.slice(0, 8).map((r) => (
                <article key={r.id} className="rounded-[20px] bg-white/[0.04] p-4 ring-1 ring-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-[13px] font-semibold">{(r.reviewer_name || "C").slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{r.reviewer_name || "Client"}</p>
                      <p className="text-[11px] text-white/40">{format(new Date(r.created_at), "MMM d, yyyy")}</p>
                    </div>
                    <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={cn("h-3 w-3", s <= r.rating ? "fill-[#FFCC00] text-[#FFCC00]" : "text-white/15")} />)}</span>
                  </div>
                  {r.comment && <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/70">{r.comment}</p>}
                </article>
              )) : (
                <p className="py-4 text-center text-[13px] text-white/40">{ratingCount > 0 ? "Written reviews are private for this shop." : "No reviews yet. Book and be the first."}</p>
              )}
            </div>
          </Section>

          {/* Info */}
          <Section id="info" title="About & info">
            <div className="space-y-3">
              {about && <p className="text-[14.5px] leading-relaxed text-white/70">{about}</p>}

              {(site?.hours || settings) && (
                <div className="rounded-[22px] bg-white/[0.04] px-4 py-3.5 ring-1 ring-white/[0.05]">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Opening hours</p>
                  {site?.hours ? (
                    <p className="whitespace-pre-line text-[14px] font-medium">{site.hours}</p>
                  ) : settings && (
                    <ul className="divide-y divide-white/[0.05]">
                      {DAYS.map((day, i) => {
                        const open = workingDays.includes(i);
                        const isToday = new Date().getDay() === i;
                        return (
                          <li key={day} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                            <span className={cn("text-[13px]", isToday ? "font-semibold text-white" : "text-white/70")}>
                              {day}{isToday && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>Today</span>}
                            </span>
                            <span className={cn("text-[13px] tabular-nums", open ? (isToday ? "font-semibold" : "text-white/70") : "text-white/30")}>
                              {open ? `${fmtTime(settings.start_hour)} – ${fmtTime(settings.end_hour)}` : "Closed"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {links.length > 0 && (
                <div className="overflow-hidden rounded-[22px] bg-white/[0.04] ring-1 ring-white/[0.05]">
                  {links.map(({ icon: Icon, label, value, href, internal }, i) => (
                    <a key={label} href={href} onClick={(e) => { haptic("light"); if (internal) { e.preventDefault(); navigate(href); } }} target={internal ? undefined : "_blank"} rel="noreferrer" className={cn("flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 active:bg-white/[0.04]", i > 0 && "border-t border-white/[0.05]")}>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${ACCENT}1f`, color: ACCENT }}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</span>
                        <span className="block truncate text-[14px] font-medium">{value}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-white/25" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Share & grow */}
          <Section id="share" title="Spread the word">
            <div className="rounded-[24px] bg-white/[0.04] p-4 ring-1 ring-white/[0.05]">
              <p className="text-[14px] text-white/70">Know someone who needs a fresh cut? Send them {name}'s page.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={share} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] text-[14px] font-semibold transition-transform duration-150 ease-out active:scale-[0.97]" style={{ backgroundColor: ACCENT }}>
                  <Share2 className="h-4 w-4" />Share
                </button>
                <button type="button" onClick={copyLink} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] bg-white/[0.08] text-[14px] font-semibold transition-transform duration-150 ease-out active:scale-[0.97]">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={String(copied)} initial={{ opacity: 0, filter: "blur(2px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(2px)" }} transition={{ duration: 0.15 }} className="inline-flex items-center gap-2">
                      {copied ? <><Check className="h-4 w-4 text-[#30D158]" />Copied</> : <><Link2 className="h-4 w-4" />Copy link</>}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </div>
            </div>
            <Link to="/auth" className="mt-3 flex items-center gap-3 rounded-[24px] p-4 ring-1 ring-white/[0.06] transition-transform duration-150 ease-out active:scale-[0.98]" style={{ background: "linear-gradient(135deg, rgba(94,92,230,0.18), rgba(255,255,255,0.02))" }}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#5E5CE6]/25 text-[#A5A3FF]"><Sparkles className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold">Are you a barber?</span>
                <span className="block text-[12.5px] text-white/55">Get a free booking page like this in 2 minutes.</span>
              </span>
              <ChevronRight className="h-4 w-4 text-white/40" />
            </Link>
          </Section>

          <nav aria-label="Breadcrumb" className="mt-8 text-[12px] text-white/35">
            <Link to="/" className="hover:text-white/60">Cutzioo</Link> <span aria-hidden>›</span>{" "}
            <Link to="/find-barber" className="hover:text-white/60">Barbers{city ? ` in ${city}` : ""}</Link> <span aria-hidden>›</span> <span>{name}</span>
          </nav>
        </main>
      </div>

      {/* Sticky Book Now */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <motion.div
          initial={{ opacity: 0, transform: reduce ? "none" : "translateY(100%)" }}
          animate={{ opacity: 1, transform: "translateY(0%)" }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1], delay: 0.15 }}
          className="pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-[26px] bg-[#1C1C1E]/90 p-2.5 pl-4 ring-1 ring-white/[0.08] backdrop-blur-xl"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{selectedService?.name || "Choose a service"}</p>
            <p className="truncate text-[12px] tabular-nums text-white/50">
              {selectedService ? `€${Number(selectedService.price).toFixed(0)} · ${selectedService.duration} min` : "Prices shown above"}
              {nextSlots && ` · next ${format(nextSlots.date, "EEE")} ${nextSlots.slots[0]}`}
            </p>
          </div>
          <button
            type="button"
            disabled={!barberId || !profile?.booking_link}
            onClick={() => openBooking()}
            className="h-[50px] shrink-0 rounded-[18px] px-7 text-[16px] font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            Book now
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setLightbox(null)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4">
            <motion.img initial={{ transform: "scale(0.94)" }} animate={{ transform: "scale(1)" }} exit={{ transform: "scale(0.96)" }} transition={{ duration: 0.25, ease: EASE_OUT }} src={lightbox} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>

      {bookOpen && barberId && (
        <QuickBookSheet
          open={bookOpen}
          onOpenChange={setBookOpen}
          barberId={barberId}
          barberName={name}
          bookingLink={profile?.booking_link}
          accentColor={ACCENT}
          initialDate={bookAt?.date}
          initialTime={bookAt?.time}
          initialServiceId={serviceId || undefined}
        />
      )}
    </div>
  );
}

function IconBtn({ children, label, onClick, glass }: { children: ReactNode; label: string; onClick: () => void; glass?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-150 ease-out active:scale-[0.92]", glass ? "bg-black/35 ring-1 ring-white/10 backdrop-blur-md" : "bg-white/[0.06]")}>
      {children}
    </button>
  );
}

function Stat({ value, label, onClick }: { value: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center py-3.5 transition-transform duration-150 ease-out active:scale-[0.97]">
      <span className="text-[17px] font-semibold tabular-nums">{value}</span>
      <span className="mt-0.5 text-[11.5px] text-white/45">{label}</span>
    </button>
  );
}

function Section({ id, title, aside, children }: { id: string; title: string; aside?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, transform: reduce ? "none" : "translateY(12px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="mt-8 scroll-mt-28"
    >
      <h2 className="mb-3 flex items-baseline gap-2 text-[21px] font-bold tracking-[-0.02em]">
        {title}
        {aside && <span className="text-[14px] font-medium text-white/35">{aside}</span>}
      </h2>
      {children}
    </motion.section>
  );
}

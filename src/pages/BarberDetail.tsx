import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft, Share2, Heart, Star, MapPin, Phone, Instagram, Globe, Clock,
  Calendar as CalendarIcon, MessageCircle, Scissors, ChevronRight, Images,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { QuickBookSheet } from "@/components/QuickBookSheet";
import { Seo } from "@/components/Seo";

const ACCENT = "#FF2D46";
const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

type Tab = "about" | "reviews";

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
const endOf = (t: string, mins: number) => {
  const [h, m] = t.split(":").map(Number);
  const total = h * 60 + m + mins;
  return fmtTime(`${Math.floor(total / 60)}:${total % 60}`);
};

export default function BarberDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const seed = (location.state || {}) as { name?: string; avatar_url?: string | null; banner_url?: string | null; rating?: number | null; rating_count?: number | null };

  const [tab, setTab] = useState<Tab>("about");
  const [favs, setFavs] = useState<string[]>(readFavs);
  const [serviceId, setServiceId] = useState("");
  const [date] = useState<Date>(new Date());
  const [time] = useState("");
  const [bookOpen, setBookOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

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
  const rating = profile?.rating ?? seed.rating ?? 5;
  const ratingCount = profile?.rating_count ?? seed.rating_count ?? 0;
  const banner = profile?.banner_url || site?.hero_url || seed.banner_url || null;
  const avatar = profile?.avatar_url || seed.avatar_url || null;
  const gallery: string[] = useMemo(
    () => (Array.isArray(site?.gallery) ? (site!.gallery as unknown[]).filter((g): g is string => typeof g === "string" && !!g) : []),
    [site],
  );
  const services = data?.services ?? [];
  const reviews = data?.reviews ?? [];
  const isFav = favs.includes(barberId);

  useEffect(() => { if (services.length && !serviceId) setServiceId(services[0].id); }, [services, serviceId]);

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

  const selectedService = services.find((s) => s.id === serviceId);

  const toggleFav = () => {
    if (!barberId) return;
    haptic(isFav ? "light" : "success");
    const next = isFav ? favs.filter((x) => x !== barberId) : [...favs, barberId];
    setFavs(next);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
  };

  const share = async () => {
    haptic("light");
    const url = `${window.location.origin}/b/${slug}`;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };

  const links = [
    site?.instagram && { icon: Instagram, label: "Instagram", value: site.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "@").replace(/\/$/, ""), href: toHref(site.instagram, "instagram") },
    site?.published && profile?.booking_link && { icon: Globe, label: "Website", value: `cutzioo.com/site/${profile.booking_link}`, href: `/site/${profile.booking_link}`, internal: true },
    !site?.published && site?.website_url && { icon: Globe, label: "Website", value: site.website_url.replace(/^https?:\/\//, ""), href: toHref(site.website_url, "web") },
    site?.whatsapp && { icon: MessageCircle, label: "WhatsApp", value: site.whatsapp, href: toHref(site.whatsapp, "whatsapp") },
    profile?.phone && { icon: Phone, label: "Call", value: profile.phone, href: toHref(profile.phone, "tel") },
    (profile?.address || site?.address) && { icon: MapPin, label: "Address", value: (profile?.address || site?.address) as string, href: `https://maps.google.com/?q=${encodeURIComponent((profile?.address || site?.address) as string)}` },
  ].filter(Boolean) as { icon: typeof Instagram; label: string; value: string; href: string; internal?: boolean }[];

  if (!isLoading && (isError || data === null)) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Scissors className="h-10 w-10 text-white/30" />
        <p className="text-[17px] font-semibold">This barber isn't available</p>
        <button onClick={() => navigate(-1)} className="rounded-full bg-white/10 px-5 py-2.5 text-[14px] font-semibold">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white">
      <Seo title={`${name} — Book on Cutzioo`} description={profile?.description || `Book ${name} on Cutzioo.`} path={`/b/${slug}`} />

      {/* Hero */}
      <div className="relative h-[46vh] min-h-[300px] w-full overflow-hidden">
        {banner ? (
          <motion.img initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} src={banner} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: `linear-gradient(160deg, ${ACCENT} 0%, #3a0a12 70%, #0A0A0C 100%)` }}>
            <Scissors className="absolute right-6 top-1/3 h-40 w-40 -rotate-12 text-white/10" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#0A0A0C]" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button onClick={() => { haptic("light"); navigate(-1); }} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 backdrop-blur-md ring-1 ring-white/10 active:scale-90 transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button onClick={share} aria-label="Share" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 backdrop-blur-md ring-1 ring-white/10 active:scale-90 transition">
            <Share2 className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* Sheet */}
      <motion.div initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring} className="relative -mt-10 rounded-t-[32px] bg-[#121215] px-5 pb-36 pt-5 ring-1 ring-white/[0.06]">
        <div className="flex items-start gap-3">
          {avatar && <img src={avatar} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-[#121215]" />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[24px] font-semibold tracking-tight">{isLoading && !seed.name ? <span className="inline-block h-6 w-40 rounded bg-white/10 animate-pulse" /> : name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
              <span className="inline-flex items-center gap-1 font-semibold"><Star className="h-3.5 w-3.5 fill-[#FFCC00] text-[#FFCC00]" />{Number(rating).toFixed(1)}<span className="font-normal text-white/45">({ratingCount})</span></span>
              {(site?.tagline || profile?.full_name) && <span className="truncate font-medium" style={{ color: ACCENT }}>{site?.tagline || profile?.full_name}</span>}
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.85 }} onClick={toggleFav} aria-label="Favorite" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
            <motion.span key={String(isFav)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 18 }}>
              <Heart className={cn("h-5 w-5 transition-colors", isFav ? "fill-[#FF2D46] text-[#FF2D46]" : "text-white/60")} />
            </motion.span>
          </motion.button>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex rounded-full bg-white/[0.05] p-1">
          {(["about", "reviews"] as Tab[]).map((t) => (
            <button key={t} onClick={() => { if (t !== tab) { haptic("selection"); setTab(t); } }} className={cn("relative flex-1 rounded-full py-2.5 text-[13px] font-semibold capitalize transition-colors", tab === t ? "text-white" : "text-white/45")}>
              {tab === t && <motion.span layoutId="detail-tab" transition={spring} className="absolute inset-0 rounded-full" style={{ backgroundColor: ACCENT }} />}
              <span className="relative">{t}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mt-5">
            {tab === "about" && (
              <div className="space-y-7">
                {(site?.about || profile?.description) && (
                  <section>
                    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40"><Scissors className="h-3.5 w-3.5" />About</p>
                    <p className="text-[14px] leading-relaxed text-white/70">{site?.about || profile?.description}</p>
                  </section>
                )}

                {gallery.length > 0 && (
                  <div>
                    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40"><Images className="h-3.5 w-3.5" />Photos</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {gallery.slice(0, 9).map((g, i) => (
                        <motion.button key={g} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }} onClick={() => { haptic("light"); setLightbox(g); }} className={cn("overflow-hidden rounded-xl bg-white/[0.05]", i === 0 && "col-span-2 row-span-2")}>
                          <img src={g} alt="" loading="lazy" className="aspect-square h-full w-full object-cover" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {links.length > 0 && (
                  <section>
                    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40"><Globe className="h-3.5 w-3.5" />Details</p>
                    <div className="overflow-hidden rounded-[20px] bg-white/[0.04]">
                    {links.map(({ icon: Icon, label, value, href, internal }, i) => (
                      <a key={label} href={href} onClick={(e) => { haptic("light"); if (internal) { e.preventDefault(); navigate(href); } }} target={internal ? undefined : "_blank"} rel="noreferrer" className={cn("flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.04]", i > 0 && "border-t border-white/[0.05]")}>
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${ACCENT}1f`, color: ACCENT }}><Icon className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</span>
                          <span className="block truncate text-[14px] font-medium">{value}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-white/25" />
                      </a>
                    ))}
                    </div>
                  </section>
                )}

                {(site?.hours || settings) && (
                  <section>
                    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40"><Clock className="h-3.5 w-3.5" />Hours</p>
                    <div className="rounded-[20px] bg-white/[0.04] px-4 py-3.5">
                      {site?.hours ? (
                        <p className="text-[14px] font-medium whitespace-pre-line">{site.hours}</p>
                      ) : settings && (
                        <ul className="divide-y divide-white/[0.05]">
                          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, i) => {
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
                  </section>
                )}

                {!site?.about && !profile?.description && gallery.length === 0 && links.length === 0 && !site?.hours && !settings && (
                  <p className="py-6 text-center text-[13px] text-white/40">No details added yet.</p>
                )}
              </div>
            )}

            {tab === "reviews" && (
              <div className="space-y-3">
                <div className="flex items-center gap-4 rounded-[20px] bg-white/[0.04] p-4">
                  <span className="text-[44px] font-semibold leading-none tabular-nums">{Number(rating).toFixed(1)}</span>
                  <div>
                    <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("h-4 w-4", i <= Math.round(rating) ? "fill-[#FFCC00] text-[#FFCC00]" : "text-white/15")} />)}</div>
                    <p className="mt-1 text-[12px] text-white/50">{ratingCount} {ratingCount === 1 ? "review" : "reviews"}</p>
                  </div>
                </div>
                {reviews.length > 0 ? reviews.map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-[20px] bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-semibold">{r.reviewer_name || "Client"}</span>
                      <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={cn("h-3 w-3", s <= r.rating ? "fill-[#FFCC00] text-[#FFCC00]" : "text-white/15")} />)}</span>
                    </div>
                    {r.comment && <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{r.comment}</p>}
                    <p className="mt-2 text-[11px] text-white/35">{format(new Date(r.created_at), "MMM d, yyyy")}</p>
                  </motion.div>
                )) : (
                  <p className="py-4 text-center text-[13px] text-white/40">{ratingCount > 0 ? "Written reviews are private for this shop." : "No reviews yet — be the first."}</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Sticky summary + Book Now */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
        <div className="pointer-events-auto mx-auto max-w-md rounded-[26px] bg-[#1C1C1E] p-3 ring-1 ring-white/[0.08] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between px-2 pb-2.5 text-[13px]">
            <span className="inline-flex items-center gap-2 text-white/80"><CalendarIcon className="h-4 w-4" style={{ color: ACCENT }} />{format(date, "EEEE, MMMM d")}</span>
            <span className="tabular-nums text-white/50">{time && selectedService ? `${fmtTime(time)} – ${endOf(time, selectedService.duration)}` : "Pick a time"}</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.975 }}
            disabled={!barberId || !profile?.booking_link}
            onClick={() => { haptic("medium"); setBookOpen(true); }}
            className="h-[52px] w-full rounded-[18px] text-[16px] font-semibold text-white disabled:opacity-40"
            style={{ background: `linear-gradient(180deg, #FF5A6E 0%, ${ACCENT} 55%, #E0152F 100%)` }}
          >
            Book Now
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4">
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} transition={spring} src={lightbox} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
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
          initialDate={date}
          initialTime={time || undefined}
          initialServiceId={serviceId || undefined}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, ChevronRight, MapPin, Radar, Star, X } from "lucide-react";
import { Ripple } from "@/components/ui/ripple";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export type SuggestBarber = {
  id: string;
  brandName: string;
  booking_link: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  rating: number | null;
  rating_count: number | null;
  latitude?: number | null;
  longitude?: number | null;
  today_count?: number;
  monthly_capped?: boolean;
};

const SEARCH_MS = 1500;
const ease = [0.22, 1, 0.36, 1] as const;

const kmBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const formatKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`);

/** Ranks bookable barbers by closeness, bookings today and rating. */
function rank(barbers: SuggestBarber[], me: { lat: number; lng: number } | null) {
  const bookable = barbers.filter((b) => b.booking_link && !b.monthly_capped);
  const pool = (bookable.length ? bookable : barbers).map((b) => ({
    b,
    km: me && b.latitude != null && b.longitude != null ? kmBetween(me, { lat: b.latitude, lng: b.longitude }) : null,
  }));
  const maxToday = Math.max(1, ...pool.map((p) => p.b.today_count ?? 0));
  const scored = pool
    .map((p) => {
      const near = p.km == null ? 0.3 : 1 / (1 + p.km / 3);
      const busy = (p.b.today_count ?? 0) / maxToday;
      const trust = Math.min(1, (p.b.rating_count ?? 0) / 10);
      const stars = ((p.b.rating ?? 0) / 5) * (0.5 + 0.5 * trust);
      return { ...p, score: 0.45 * near + 0.25 * busy + 0.3 * stars };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const closest = scored.filter((s) => s.km != null).sort((a, b) => a.km! - b.km!)[0]?.b.id;
  const busiest = [...scored].sort((a, b) => (b.b.today_count ?? 0) - (a.b.today_count ?? 0))[0];
  const best = [...scored].sort((a, b) => (b.b.rating ?? 0) - (a.b.rating ?? 0))[0];
  return scored.map((s) => ({
    ...s,
    tags: [
      s.b.id === closest && "Closest",
      busiest && (busiest.b.today_count ?? 0) > 0 && s.b.id === busiest.b.id && "Most booked today",
      best && (best.b.rating ?? 0) > 0 && s.b.id === best.b.id && "Top rated",
    ].filter(Boolean) as string[],
  }));
}

export function SuggestBarberSheet({
  open,
  onClose,
  barbers,
  userLocation,
}: {
  open: boolean;
  onClose: () => void;
  barbers: SuggestBarber[];
  userLocation: { lat: number; lng: number } | null;
}) {
  const navigate = useNavigate();
  const [searching, setSearching] = useState(true);
  const [picks, setPicks] = useState<ReturnType<typeof rank>>([]);

  useEffect(() => {
    if (!open) return;
    setSearching(true);
    const t = window.setTimeout(() => {
      setPicks(rank(barbers, userLocation));
      setSearching(false);
      haptic("success");
    }, SEARCH_MS);
    return () => window.clearTimeout(t);
    // Rank once per open so results don't reshuffle while the sheet is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const openBarber = (b: SuggestBarber) => {
    if (!b.booking_link) return;
    haptic("medium");
    onClose();
    navigate(`/b/${b.booking_link}`, {
      state: { name: b.brandName, avatar_url: b.avatar_url, banner_url: b.banner_url, rating: b.rating, rating_count: b.rating_count },
    });
  };

  const today = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: "long" }), []);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="suggest"
          role="dialog"
          aria-modal
          aria-label="Suggested barbers"
          className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-black/85 text-white backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="relative flex items-center justify-end px-5 pt-[max(env(safe-area-inset-top),16px)]">
            <motion.button
              type="button"
              aria-label="Close"
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#1C1C1E] text-white/85"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {searching ? (
              <motion.div
                key="searching"
                className="relative flex flex-1 flex-col items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease }}
              >
                <Ripple />
                <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-[#FF5A6E] to-[#E0152F] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),0_12px_30px_rgba(255,45,70,0.35)]">
                  <Radar className="h-9 w-9" />
                </div>
                <p className="relative z-10 mt-8 text-[22px] font-semibold tracking-[-0.02em]">Finding your barber…</p>
                <p className="relative z-10 mt-1.5 text-[14px] text-white/50">Checking distance, bookings and ratings</p>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                className="flex-1 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease }}
              >
                <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">Suggested for you</h2>
                <p className="mt-1 text-[14px] text-white/50">Close by, busy {today} and well rated.</p>

                {picks.length === 0 ? (
                  <p className="mt-10 text-center text-[15px] text-white/50">No barbers available right now.</p>
                ) : (
                  <div className="mt-6 space-y-3">
                    {picks.map(({ b, km, tags }, i) => (
                      <motion.button
                        key={b.id}
                        type="button"
                        disabled={!b.booking_link}
                        onClick={() => openBarber(b)}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease, delay: 0.08 + i * 0.07 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "flex w-full items-center gap-4 rounded-[24px] border p-4 text-left",
                          i === 0 ? "border-[#FF5A6E]/35 bg-[#1C1C1E]" : "border-white/[0.06] bg-[#141416]",
                        )}
                      >
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[18px] bg-[#2C2C2E]">
                          {b.avatar_url ? (
                            <img src={b.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[22px] font-semibold">
                              {(b.brandName || "B").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[17px] font-semibold tracking-[-0.01em]">{b.brandName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-medium text-white/60">
                            {(b.rating ?? 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 fill-[#FFD60A] text-[#FFD60A]" />
                                {(b.rating ?? 0).toFixed(1)}
                                <span className="text-white/35">({b.rating_count ?? 0})</span>
                              </span>
                            )}
                            {km != null && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {formatKm(km)}
                              </span>
                            )}
                            {(b.today_count ?? 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <CalendarCheck className="h-3.5 w-3.5" />
                                {b.today_count} today
                              </span>
                            )}
                          </div>
                          {tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {tags.map((t) => (
                                <span key={t} className="rounded-full bg-[#FF2D46]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#FF8FA3]">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {b.booking_link && <ChevronRight className="h-5 w-5 shrink-0 text-white/35" />}
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

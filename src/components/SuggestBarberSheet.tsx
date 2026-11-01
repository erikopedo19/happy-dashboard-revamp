import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, ChevronRight, MapPin, Radar, RotateCw, Star, X } from "lucide-react";
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
const PHASES = ["Checking distance", "Checking bookings today", "Checking ratings"];
const spring = { type: "spring" as const, stiffness: 340, damping: 30 };
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
  const [run, setRun] = useState(0);
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    if (!open) seenRef.current.clear();
  }, [open]);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!open || !searching) return;
    setPhase(0);
    const id = window.setInterval(() => setPhase((p) => Math.min(p + 1, PHASES.length - 1)), SEARCH_MS / PHASES.length);
    return () => window.clearInterval(id);
  }, [open, searching, run]);

  useEffect(() => {
    if (!open) return;
    setSearching(true);
    const t = window.setTimeout(() => {
      // "Search again" skips barbers already suggested until the pool runs out.
      const fresh = barbers.filter((b) => !seenRef.current.has(b.id));
      const pool = fresh.filter((b) => b.booking_link).length ? fresh : barbers;
      if (pool === barbers) seenRef.current.clear();
      const next = rank(pool, userLocation);
      next.forEach((p) => seenRef.current.add(p.b.id));
      setPicks(next);
      setSearching(false);
      haptic("success");
    }, SEARCH_MS);
    return () => window.clearTimeout(t);
    // Rank once per search so results don't reshuffle while the sheet is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, run]);

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
  const [top, ...rest] = picks;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="suggest"
          role="dialog"
          aria-modal
          aria-label="Suggested barbers"
          className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[#050507] text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,45,70,0.28)_0%,rgba(255,45,70,0.08)_45%,transparent_70%)]"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
            />
            <div className="absolute -bottom-48 -left-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(88,86,214,0.22)_0%,transparent_70%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.35)_100%)]" />
          </div>
          <div className="relative z-20 flex items-center justify-end px-5 pt-[max(env(safe-area-inset-top),16px)]">
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
                key={`searching-${run}`}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.12 }}
                transition={{ duration: 0.45, ease }}
              >
                <Ripple mainCircleSize={230} />
                <div className="absolute left-1/2 top-1/2 flex w-[200px] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#FF5A6E] to-[#E0152F] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4)]"
                  >
                    <Radar className="h-8 w-8" />
                  </motion.div>
                  <p className="mt-3 text-[17px] font-semibold tracking-[-0.02em]">Finding barbers</p>
                  <div className="relative mt-0.5 h-4 w-full overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        key={phase}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.2, ease }}
                        className="absolute inset-x-0 text-[12px] text-white/50"
                      >
                        {PHASES[phase]}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`results-${run}`}
                className="relative z-10 flex-1 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-1"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
              >
                <motion.h2
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: spring } }}
                  className="text-[32px] font-semibold leading-tight tracking-[-0.035em]"
                >
                  Suggested for you
                </motion.h2>
                <motion.p variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: spring } }} className="mt-1 text-[14px] text-white/50">
                  Close by, busy {today} and well rated.
                </motion.p>

                {!top ? (
                  <p className="mt-12 text-center text-[15px] text-white/50">No barbers available right now.</p>
                ) : (
                  <>
                    <motion.button
                      type="button"
                      disabled={!top.b.booking_link}
                      onClick={() => openBarber(top.b)}
                      whileTap={{ scale: 0.98 }}
                      variants={{ hidden: { opacity: 0, y: 24, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1, transition: spring } }}
                      className="relative mt-6 block w-full overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#1C1C1E] text-left"
                    >
                      <div className="relative h-36 w-full overflow-hidden">
                        {top.b.banner_url ? (
                          <motion.img
                            src={top.b.banner_url}
                            alt=""
                            initial={{ scale: 1.12 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 1.1, ease }}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-[radial-gradient(120%_120%_at_0%_0%,#FF5A6E_0%,#7A1020_45%,#1C1C1E_100%)]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-[#1C1C1E]/30 to-transparent" />
                        <span className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md">
                          Best match
                        </span>
                        <MatchRing value={top.score} className="absolute right-4 top-4" />
                      </div>
                      <div className="relative -mt-8 flex items-end gap-3.5 px-5">
                        <Avatar b={top.b} className="h-16 w-16 rounded-[20px] ring-4 ring-[#1C1C1E]" />
                        <div className="min-w-0 flex-1 pb-1">
                          <p className="truncate text-[21px] font-semibold tracking-[-0.02em]">{top.b.brandName}</p>
                        </div>
                      </div>
                      <div className="px-5 pb-5 pt-2">
                        <Meta b={top.b} km={top.km} />
                        <Tags tags={top.tags} />
                        {top.b.booking_link && (
                          <div className="mt-4 flex h-12 items-center justify-center gap-1.5 rounded-[16px] bg-gradient-to-b from-[#FF5A6E] via-[#FF2D46] to-[#E0152F] text-[15px] font-semibold">
                            Book now <ChevronRight className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </motion.button>

                    {rest.length > 0 && (
                      <motion.p variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="mb-2.5 mt-7 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/40">
                        Also great
                      </motion.p>
                    )}
                    <div className="space-y-2.5">
                      {rest.map(({ b, km, tags, score }) => (
                        <motion.button
                          key={b.id}
                          type="button"
                          disabled={!b.booking_link}
                          onClick={() => openBarber(b)}
                          whileTap={{ scale: 0.98 }}
                          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: spring } }}
                          className="flex w-full items-center gap-3.5 rounded-[24px] border border-white/[0.06] bg-[#141416] p-3.5 text-left"
                        >
                          <Avatar b={b} className="h-14 w-14 rounded-[17px]" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[16px] font-semibold tracking-[-0.01em]">{b.brandName}</p>
                            <Meta b={b} km={km} />
                            <Tags tags={tags} />
                          </div>
                          <MatchRing value={score} small />
                        </motion.button>
                      ))}
                    </div>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
                      onClick={() => { haptic("light"); setRun((r) => r + 1); }}
                      className="mx-auto mt-6 flex h-11 items-center gap-2 rounded-full bg-white/[0.06] px-5 text-[14px] font-medium text-white/75"
                    >
                      <RotateCw className="h-4 w-4" /> Search again
                    </motion.button>
                  </>
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

function Avatar({ b, className }: { b: SuggestBarber; className?: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-[#2C2C2E]", className)}>
      {b.avatar_url ? (
        <img src={b.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[20px] font-semibold">{(b.brandName || "B").charAt(0).toUpperCase()}</div>
      )}
    </div>
  );
}

function Meta({ b, km }: { b: SuggestBarber; km: number | null }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-medium text-white/60">
      {(b.rating ?? 0) > 0 && (
        <span className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-[#FFD60A] text-[#FFD60A]" />
          {(b.rating ?? 0).toFixed(1)}
          <span className="text-white/35">({b.rating_count ?? 0})</span>
        </span>
      )}
      {km != null && (
        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{formatKm(km)}</span>
      )}
      {(b.today_count ?? 0) > 0 && (
        <span className="flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5" />{b.today_count} today</span>
      )}
    </div>
  );
}

function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tags.map((t, i) => (
        <motion.span
          key={t}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 26, delay: 0.35 + i * 0.06 }}
          className="rounded-full bg-[#FF2D46]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#FF8FA3]"
        >
          {t}
        </motion.span>
      ))}
    </div>
  );
}

function MatchRing({ value, small, className }: { value: number; small?: boolean; className?: string }) {
  const pct = Math.max(1, Math.min(99, Math.round(value * 100)));
  const size = small ? 44 : 52;
  const r = size / 2 - 3;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill={small ? "none" : "rgba(0,0,0,0.4)"} stroke="rgba(255,255,255,0.12)" strokeWidth={3} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#FF5A6E"
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: pct / 100 }}
          transition={{ duration: 0.9, ease, delay: 0.25 }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn("font-semibold tabular-nums", small ? "text-[12px]" : "text-[14px]")}>{pct}%</span>
        {!small && <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-white/55">match</span>}
      </span>
    </div>
  );
}

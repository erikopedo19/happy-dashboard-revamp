import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Flame, Star, Users, CalendarCheck, Sparkles, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

export interface DiscoverBarber {
  id: string;
  brandName: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  brand_color?: string | null;
  booking_link?: string | null;
  rating?: number | null;
  rating_count?: number | null;
}

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

/* ---------- Community pulse: three quick stats ---------- */

export function CommunityPulse({
  shops,
  bookingsToday,
  avgRating,
}: {
  shops: number;
  bookingsToday: number;
  avgRating: number | null;
}) {
  const tiles = [
    { icon: Users, label: "Shops", value: String(shops), tone: "text-[#0A84FF]" },
    { icon: CalendarCheck, label: "Booked today", value: String(bookingsToday), tone: "text-[#30D158]" },
    {
      icon: Star,
      label: "Avg rating",
      value: avgRating ? avgRating.toFixed(1) : "—",
      tone: "text-[#FFD60A]",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 mb-4">
      {tiles.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...spring, delay: i * 0.05 }}
          className="rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.07] px-3 py-3"
        >
          <t.icon className={cn("w-4 h-4 mb-2", t.tone)} />
          <p className="text-[19px] font-semibold leading-none text-[#1C1C1E] dark:text-[#F2F2F7]">
            {t.value}
          </p>
          <p className="mt-1 text-[11px] text-[#8E8E93]">{t.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Trending rail: horizontally scrollable highlights ---------- */

export function TrendingRail({
  items,
  boostedIds,
}: {
  items: DiscoverBarber[];
  boostedIds?: Set<string>;
}) {
  if (!items.length) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <Flame className="w-4 h-4 text-[#FF375F]" />
        <h2 className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Trending now</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1 snap-x snap-mandatory">
        {items.map((b, i) => {
          const card = (
            <motion.div
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring, delay: i * 0.04 }}
              whileTap={{ scale: 0.97 }}
              onTapStart={() => haptic("light")}
              className="relative w-[164px] shrink-0 snap-start overflow-hidden rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.07]"
            >
              <div
                className="h-20 w-full"
                style={{
                  background: b.banner_url
                    ? `url(${b.banner_url}) center/cover`
                    : `linear-gradient(135deg, ${b.brand_color || "#FF375F"}, rgba(0,0,0,0.65))`,
                }}
              />
              {boostedIds?.has(b.id) && (
                <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                  <Rocket className="w-3 h-3" /> Boosted
                </span>
              )}
              <div className="p-3">
                <p className="truncate text-[13.5px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                  {b.brandName}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11.5px] text-[#8E8E93]">
                  <Star className="w-3 h-3 text-[#FFD60A] fill-[#FFD60A]" />
                  {b.rating ? b.rating.toFixed(1) : "New"}
                  {b.rating_count ? ` · ${b.rating_count}` : ""}
                </p>
              </div>
            </motion.div>
          );

          return b.booking_link ? (
            <Link key={b.id} to={`/${b.booking_link}`} aria-label={`Book at ${b.brandName}`}>
              {card}
            </Link>
          ) : (
            <div key={b.id}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Small promo strip for shop owners ---------- */

export function DiscoverPromo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mb-5 flex items-center gap-3 rounded-[22px] border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#1C1C1E] p-4"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF375F]/12 text-[#FF375F]">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Own a barbershop?</p>
        <p className="text-[12px] text-[#8E8E93]">Get listed here and take bookings in minutes.</p>
      </div>
      <Link
        to="/pricing"
        className="ml-auto shrink-0 rounded-full bg-[#FF375F] px-3.5 py-2 text-[12.5px] font-semibold text-white active:scale-95 transition-transform"
      >
        Start
      </Link>
    </motion.div>
  );
}

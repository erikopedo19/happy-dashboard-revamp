import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Flame, Star, Users, CalendarCheck, Sparkles, Rocket, Scissors, Crown, Zap, Compass, TrendingUp, Clock, MapPin } from "lucide-react";
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

/* ---------- Style Categories: Quick filters by hair style ---------- */

const STYLE_CATEGORIES = [
  { id: "fade", label: "Fade", icon: Scissors, color: "#FF375F" },
  { id: "classic", label: "Classic", icon: Crown, color: "#007AFF" },
  { id: "modern", label: "Modern", icon: Sparkles, color: "#5856D6" },
  { id: "beard", label: "Beard", icon: Zap, color: "#FF9500" },
  { id: "kids", label: "Kids", icon: Users, color: "#34C759" },
  { id: "buzz", label: "Buzz Cut", icon: Compass, color: "#AF52DE" },
];

export function StyleCategories() {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <Compass className="w-4 h-4 text-[#FF375F]" />
        <h2 className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Find by style</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1 snap-x snap-mandatory">
        {STYLE_CATEGORIES.map((style, i) => (
          <motion.button
            key={style.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: i * 0.03 }}
            whileTap={{ scale: 0.95 }}
            onTapStart={() => haptic("light")}
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.07] shrink-0 snap-start active:scale-95 transition-transform"
          >
            <style.icon className="w-4 h-4" style={{ color: style.color }} />
            <span className="text-[13px] font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">{style.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Featured Section: Highlighted barbers with special badges ---------- */

export function FeaturedSection({
  items,
  boostedIds,
}: {
  items: DiscoverBarber[];
  boostedIds?: Set<string>;
}) {
  const featured = items.slice(0, 3);
  if (!featured.length) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <Crown className="w-4 h-4 text-[#FFD60A]" />
        <h2 className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Featured barbers</h2>
      </div>

      <div className="space-y-3">
        {featured.map((barber, i) => (
          <motion.div
            key={barber.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: i * 0.05 }}
            whileTap={{ scale: 0.98 }}
            onTapStart={() => haptic("light")}
            className="relative rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.07] overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3">
              <div
                className="w-14 h-14 rounded-xl overflow-hidden shrink-0"
                style={{
                  background: barber.avatar_url
                    ? `url(${barber.avatar_url}) center/cover`
                    : `linear-gradient(135deg, ${barber.brand_color || "#FF375F"}, rgba(0,0,0,0.3))`,
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                    {barber.brandName}
                  </p>
                  {boostedIds?.has(barber.id) && (
                    <span className="flex items-center gap-1 rounded-full bg-[#FF375F]/10 px-2 py-0.5 text-[10px] font-medium text-[#FF375F]">
                      <Rocket className="w-3 h-3" /> Featured
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-[12px] text-[#8E8E93]">
                    <Star className="w-3 h-3 text-[#FFD60A] fill-[#FFD60A]" />
                    {barber.rating ? barber.rating.toFixed(1) : "New"}
                    {barber.rating_count && <span>({barber.rating_count})</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/${barber.booking_link}`}
                  className="px-3 py-1.5 rounded-full bg-[#FF375F] text-[12px] font-semibold text-white active:scale-95 transition-transform"
                >
                  Book
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Popular Areas: Location-based quick access ---------- */

const POPULAR_AREAS = [
  { name: "Downtown", count: 12 },
  { name: "Midtown", count: 8 },
  { name: "Uptown", count: 6 },
  { name: "Brooklyn", count: 15 },
  { name: "Queens", count: 9 },
];

export function PopularAreas() {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <MapPin className="w-4 h-4 text-[#34C759]" />
        <h2 className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Popular areas</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {POPULAR_AREAS.map((area, i) => (
          <motion.button
            key={area.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: i * 0.04 }}
            whileTap={{ scale: 0.95 }}
            onTapStart={() => haptic("light")}
            className="flex items-center gap-2 p-3 rounded-[16px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.07] active:scale-95 transition-transform"
          >
            <MapPin className="w-4 h-4 text-[#34C759]" />
            <div className="text-left">
              <p className="text-[13px] font-medium text-[#1C1C1E] dark:text-[#F2F2F7]">{area.name}</p>
              <p className="text-[11px] text-[#8E8E93]">{area.count} shops</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Activity Feed: Real-time booking activity ---------- */

export function ActivityFeed() {
  const activities = [
    { user: "John D.", action: "booked with", barber: "Elite Cuts", time: "2m ago" },
    { user: "Mike S.", action: "rated", barber: "Style Master", time: "5m ago" },
    { user: "Alex R.", action: "booked with", barber: "Urban Fade", time: "8m ago" },
  ];

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <TrendingUp className="w-4 h-4 text-[#5856D6]" />
        <h2 className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Live activity</h2>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-[#8E8E93]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Live
        </span>
      </div>

      <div className="rounded-[20px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.07] overflow-hidden">
        {activities.map((activity, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: i * 0.06 }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5",
              i !== activities.length - 1 && "border-b border-black/[0.04] dark:border-white/[0.04]"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF375F] to-[#5856D6] flex items-center justify-center text-white text-[12px] font-semibold">
              {activity.user.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-[#1C1C1E] dark:text-[#F2F2F7]">
                <span className="font-medium">{activity.user}</span> {activity.action} <span className="font-medium">{activity.barber}</span>
              </p>
              <p className="text-[11px] text-[#8E8E93]">{activity.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Special Offers: Promotional deals ---------- */

export function SpecialOffers() {
  const offers = [
    { title: "First visit 20% off", shop: "New customers only", valid: "This week" },
    { title: "Free beard trim", shop: "With any haircut", valid: "Limited time" },
  ];

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <Zap className="w-4 h-4 text-[#FF9500]" />
        <h2 className="text-[15px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Special offers</h2>
      </div>

      <div className="space-y-2">
        {offers.map((offer, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: i * 0.05 }}
            className="rounded-[18px] bg-gradient-to-r from-[#FF375F]/10 to-[#5856D6]/10 border border-[#FF375F]/20 p-3"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF375F] text-white shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">{offer.title}</p>
                <p className="text-[12px] text-[#8E8E93] mt-0.5">{offer.shop}</p>
                <p className="text-[11px] text-[#FF375F] mt-1 font-medium">{offer.valid}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

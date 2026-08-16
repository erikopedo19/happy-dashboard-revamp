import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Heart, MapPin, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BookingVenueIntroProps {
  name: string;
  category?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  address?: string | null;
  about?: string | null;
  imageUrl?: string | null;
  servicesCount: number;
  services?: { id: string; name: string; duration?: number | null; price?: number | null }[];
  currency?: string;
  openLabel?: string | null;
  onBook: () => void;
}

/**
 * Fresha-inspired venue landing shown before the booking form on public /book/:slug links.
 * Works in light and dark mode, mobile-first.
 */
export function BookingVenueIntro({
  name,
  category,
  rating,
  ratingCount,
  address,
  about,
  imageUrl,
  servicesCount,
  services = [],
  currency = "$",
  openLabel,
  onBook,
}: BookingVenueIntroProps) {
  const [expanded, setExpanded] = useState(false);

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: name, url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* dismissed */
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#0B0B0F] pb-28">
      {/* Hero */}
      <div className="relative h-[46vh] min-h-[280px] w-full overflow-hidden bg-neutral-200 dark:bg-[#15151A]">
        {imageUrl ? (
          <img src={imageUrl} alt={`${name} interior`} className="w-full h-full object-cover" loading="eager" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-300 to-neutral-400 dark:from-[#1B1B21] dark:to-[#101014]" />
        )}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent" />

        <div className="absolute top-4 inset-x-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            aria-label="Go back"
            className="w-11 h-11 rounded-full bg-white/85 dark:bg-black/60 backdrop-blur-xl flex items-center justify-center shadow-sm active:scale-95 transition"
          >
            <ArrowLeft className="w-5 h-5 text-black dark:text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={share}
              aria-label="Share"
              className="w-11 h-11 rounded-full bg-white/85 dark:bg-black/60 backdrop-blur-xl flex items-center justify-center shadow-sm active:scale-95 transition"
            >
              <Share2 className="w-5 h-5 text-black dark:text-white" />
            </button>
            <button
              aria-label="Save"
              className="w-11 h-11 rounded-full bg-white/85 dark:bg-black/60 backdrop-blur-xl flex items-center justify-center shadow-sm active:scale-95 transition"
            >
              <Heart className="w-5 h-5 text-black dark:text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Sheet */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="relative -mt-8 rounded-t-[28px] bg-white dark:bg-[#15151A] px-6 pt-7 pb-8 shadow-[0_-8px_40px_-20px_rgba(0,0,0,0.35)]"
      >
        <h1 className="text-[30px] leading-[1.15] font-bold tracking-tight text-black dark:text-white">{name}</h1>
        {category && <p className="mt-1.5 text-[17px] text-black/45 dark:text-white/45">{category}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[15.5px]">
          {typeof rating === "number" && rating > 0 && (
            <span className="flex items-center gap-1.5 font-semibold text-black dark:text-white">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
              {!!ratingCount && <span className="font-normal text-black/40 dark:text-white/40">({ratingCount})</span>}
            </span>
          )}
          {openLabel && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" /> {openLabel}
            </span>
          )}
        </div>

        {address && (
          <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-white/[0.05] px-4 py-3.5">
            <MapPin className="w-4.5 h-4.5 w-[18px] h-[18px] shrink-0 text-black/70 dark:text-white/70" />
            <span className="text-[15.5px] text-black dark:text-white/90 truncate">{address}</span>
          </div>
        )}

        {services.length > 0 && (
          <div className="mt-7">
            <h2 className="text-[20px] font-bold text-black dark:text-white">Services</h2>
            <div className="mt-3 space-y-2">
              {services.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  onClick={onBook}
                  className="w-full flex items-center justify-between gap-4 rounded-2xl bg-[#F2F2F7] dark:bg-white/[0.05] px-4 py-3.5 text-left active:scale-[0.99] transition"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15.5px] font-medium text-black dark:text-white">{s.name}</span>
                    {!!s.duration && (
                      <span className="block text-[13px] text-black/45 dark:text-white/45">{s.duration} min</span>
                    )}
                  </span>
                  {s.price != null && (
                    <span className="shrink-0 text-[15.5px] font-semibold text-black dark:text-white">
                      {currency}{s.price}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {about && (
          <div className="mt-7">
            <h2 className="text-[20px] font-bold text-black dark:text-white">About</h2>
            <p
              className={cn(
                "mt-3 text-[16.5px] leading-[1.55] text-black/80 dark:text-white/70",
                !expanded && "line-clamp-4"
              )}
            >
              {about}
            </p>
            {about.length > 160 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-[16.5px] font-medium text-indigo-600 dark:text-indigo-400"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-black/5 dark:border-white/[0.06] bg-white/90 dark:bg-[#101014]/90 backdrop-blur-xl px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <span className="text-[15.5px] text-black/45 dark:text-white/45">
            {servicesCount} service{servicesCount === 1 ? "" : "s"} available
          </span>
          <button
            onClick={onBook}
            className="h-[52px] px-8 rounded-full bg-black dark:bg-white text-white dark:text-black text-[17px] font-semibold active:scale-[0.98] transition"
          >
            Book now
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingVenueIntro;

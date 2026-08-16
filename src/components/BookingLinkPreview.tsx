import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MapPin, Clock, Sun, Moon, Share2, Heart, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BookingLinkPreviewProps {
  name: string;
  subtitle?: string;
  about?: string;
  address?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  servicesCount?: number;
  brandColor: string;
  buttonLabel?: string;
}

/**
 * Live-looking preview of the public booking link page.
 * Supports both light and dark presentation so barbers can check both modes.
 */
const BookingLinkPreview = ({
  name,
  subtitle = "Barber",
  about,
  address,
  avatarUrl,
  bannerUrl,
  rating,
  ratingCount,
  servicesCount = 0,
  brandColor,
  buttonLabel = "Book now",
}: BookingLinkPreviewProps) => {
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const dark = mode === "dark";

  return (
    <div className="rounded-[28px] bg-[#1C1C1E] border border-rose-500/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Live preview
        </span>
        <div className="flex items-center gap-1 rounded-full bg-[#2C2C2E] p-1">
          {(["light", "dark"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "h-7 px-3 rounded-full text-[11px] font-semibold flex items-center gap-1 transition",
                mode === m ? "bg-white/15 text-white" : "text-white/40"
              )}
            >
              {m === "light" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              {m === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </div>

      {/* Phone frame */}
      <div className="mx-auto w-full max-w-[300px] rounded-[34px] p-2 bg-black/60 border border-white/10 shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "rounded-[28px] overflow-hidden",
              dark ? "bg-[#0B0B0C]" : "bg-white"
            )}
          >
            {/* Cover */}
            <div className="relative h-32 w-full overflow-hidden">
              {bannerUrl ? (
                <img src={bannerUrl} alt={`${name} cover`} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full"
                  style={{ background: `linear-gradient(135deg, ${brandColor}, ${dark ? "#111114" : "#e5e7eb"})` }}
                />
              )}
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5">
                <span className="h-7 w-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                  <ChevronLeft className="h-3.5 w-3.5 text-white" />
                </span>
                <span className="flex gap-1.5">
                  <span className="h-7 w-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                    <Share2 className="h-3.5 w-3.5 text-white" />
                  </span>
                  <span className="h-7 w-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                    <Heart className="h-3.5 w-3.5 text-white" />
                  </span>
                </span>
              </div>
            </div>

            {/* Sheet */}
            <div
              className={cn(
                "-mt-5 relative rounded-t-[24px] px-4 pt-4 pb-3",
                dark ? "bg-[#141416]" : "bg-white"
              )}
            >
              <div className="flex items-center gap-3">
                {avatarUrl && (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="h-10 w-10 rounded-full object-cover border border-black/10"
                  />
                )}
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "text-[17px] font-bold leading-tight truncate",
                      dark ? "text-white" : "text-gray-900"
                    )}
                  >
                    {name || "Your business"}
                  </h3>
                  <p className={cn("text-[12px]", dark ? "text-white/45" : "text-gray-500")}>
                    {subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className={cn("text-[12px] font-semibold", dark ? "text-white" : "text-gray-900")}>
                  {rating ? Number(rating).toFixed(1) : "New"}
                </span>
                {!!ratingCount && (
                  <span className={cn("text-[12px]", dark ? "text-white/40" : "text-gray-500")}>
                    ({ratingCount})
                  </span>
                )}
                <span className={cn("text-[12px]", dark ? "text-white/25" : "text-gray-300")}>•</span>
                <span className="text-[12px] font-medium flex items-center gap-1" style={{ color: brandColor }}>
                  <Clock className="h-3 w-3" /> Open
                </span>
              </div>

              {address && (
                <div
                  className={cn(
                    "mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5",
                    dark ? "bg-white/[0.06]" : "bg-gray-100"
                  )}
                >
                  <MapPin className={cn("h-3.5 w-3.5 shrink-0", dark ? "text-white/60" : "text-gray-600")} />
                  <span className={cn("text-[12px] truncate", dark ? "text-white/70" : "text-gray-700")}>
                    {address}
                  </span>
                </div>
              )}

              <h4 className={cn("mt-4 text-[14px] font-bold", dark ? "text-white" : "text-gray-900")}>
                About
              </h4>
              <p
                className={cn(
                  "mt-1 text-[12px] leading-relaxed line-clamp-3",
                  dark ? "text-white/55" : "text-gray-600"
                )}
              >
                {about ||
                  "Tell your clients what makes your shop special — your style, specialities and what to expect."}
              </p>

              {/* Bottom action bar */}
              <div
                className={cn(
                  "mt-4 -mx-4 px-4 pt-3 flex items-center justify-between border-t",
                  dark ? "border-white/10" : "border-gray-200"
                )}
              >
                <span className={cn("text-[12px]", dark ? "text-white/45" : "text-gray-500")}>
                  {servicesCount} service{servicesCount === 1 ? "" : "s"} available
                </span>
                <span
                  className="h-9 px-4 rounded-full text-[13px] font-semibold text-white flex items-center"
                  style={{ backgroundColor: brandColor }}
                >
                  {buttonLabel}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BookingLinkPreview;

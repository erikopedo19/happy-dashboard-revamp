import { motion } from "framer-motion";
import { ChevronRight, TriangleAlert, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBookingLimit } from "@/hooks/use-booking-limit";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * Strict free-plan meter shown where bookings happen. At the 20/month cap it
 * becomes an upgrade prompt; at ≥15 it warns softly. Hidden for Pro users.
 */
export function BookingLimitBanner({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { loading, isPremium, used, limit, atLimit, nearLimit } = useBookingLimit();

  if (loading || isPremium || (!atLimit && !nearLimit)) return null;

  const pct = Math.min(100, Math.round((used / limit) * 100));

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      onClick={() => {
        haptic("light");
        navigate("/pricing");
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left active:scale-[0.99] transition",
        atLimit
          ? "border-[#FF2D46]/30 bg-[#FF2D46]/10 dark:bg-[#FF2D46]/15"
          : "border-[#FF9F0A]/25 bg-[#FF9F0A]/10 dark:bg-[#FF9F0A]/12",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-white",
          atLimit ? "bg-[#FF2D46]" : "bg-[#FF9F0A]",
        )}
      >
        {atLimit ? <Zap className="h-[18px] w-[18px]" /> : <TriangleAlert className="h-[18px] w-[18px]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[14px] font-semibold", atLimit ? "text-[#FF2D46] dark:text-[#FF6B7E]" : "text-[#B56208] dark:text-[#FFB340]")}>
          {atLimit ? "You're on the limit" : `${limit - used} bookings left this month`}
        </span>
        <span className="block text-[12px] text-[#8E8E93] dark:text-white/50">
          {atLimit ? `Free plan is ${limit} bookings/mo — upgrade for more` : `${used} of ${limit} free bookings used`}
        </span>
        <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/10">
          <span
            className={cn("block h-full rounded-full", atLimit ? "bg-[#FF2D46]" : "bg-[#FF9F0A]")}
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-[12px] font-bold text-[#FF2D46]">
        Upgrade<ChevronRight className="h-4 w-4" />
      </span>
    </motion.button>
  );
}

export default BookingLimitBanner;

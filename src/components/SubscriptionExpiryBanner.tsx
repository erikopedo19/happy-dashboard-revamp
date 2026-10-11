import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlarmClock, ArrowRight, Crown, RotateCcw } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

const WINDOW_DAYS = 7;
const PULSE_PLAYS = 4; // 0.7s x 4 ≈ 2.8s of red blinking

/**
 * Rounded dashboard card shown when a Pro subscription is about to expire
 * (or just did). A red ring blinks for ~3s; "Replay" re-runs the pulse.
 */
export function SubscriptionExpiryBanner() {
  const { data, status, loading } = useSubscription();

  if (loading || !data?.subscription_end) return null;

  const end = new Date(data.subscription_end);
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  const isExpired = daysLeft <= 0 || status === "expired";

  // Free users and Pro users far from expiry see nothing.
  if (!isExpired && (!data.subscribed || daysLeft > WINDOW_DAYS)) return null;

  return <ExpiryBannerCard daysLeft={daysLeft} isExpired={isExpired} end={end} />;
}

export function ExpiryBannerCard({
  daysLeft,
  isExpired,
  end,
}: {
  daysLeft: number;
  isExpired: boolean;
  end: Date;
}) {
  const navigate = useNavigate();
  const [pulseRun, setPulseRun] = useState(0);

  const tabLabel = isExpired
    ? "Expired"
    : daysLeft <= 1
      ? "Expires tomorrow"
      : "Expires this week";

  const formatted = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="relative overflow-hidden rounded-[28px] bg-[#1A1013] p-5 ring-1 ring-rose-500/30"
      aria-live="polite"
    >
      {/* ambient red glow */}
      <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-rose-500/25 blur-3xl" />

      <div className="relative flex items-start gap-4">
        {/* pulsing dot — blinks ~3s then rests; remount on Replay */}
        <div className="relative mt-1 grid h-11 w-11 shrink-0 place-items-center">
          <span
            key={pulseRun}
            aria-hidden
            className="absolute inset-0 rounded-full bg-rose-500/60"
            style={{ animation: `expiry-ring 0.7s ease-out ${PULSE_PLAYS}` }}
          />
          <span className="grid h-11 w-11 place-items-center rounded-full bg-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.55)]">
            <AlarmClock className="h-5 w-5 text-white" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em]",
              isExpired
                ? "bg-rose-500 text-white"
                : "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40"
            )}
          >
            <Crown className="h-3 w-3" />
            {tabLabel}
          </span>
          <p className="mt-2.5 text-[15px] font-bold leading-snug text-white">
            {isExpired
              ? "Your Cutzioo Pro has ended."
              : `Your Pro membership ends ${formatted}.`}
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">
            {isExpired
              ? "Pro features are paused — renew to get your bookings, team and map listing back."
              : "Renew now to keep unlimited bookings, your team and your spot on the map — no gap."}
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => navigate("/pricing")}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-rose-500 text-[14px] font-semibold text-white transition-transform hover:brightness-110 active:scale-[0.98]"
        >
          Renew Pro
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setPulseRun((n) => n + 1)}
          className="flex h-10 items-center gap-1.5 rounded-2xl bg-white/[0.07] px-3.5 text-[13px] font-medium text-white/70 ring-1 ring-white/10 transition hover:bg-white/[0.12] active:scale-[0.98]"
          aria-label="Replay pulse animation"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Replay
        </button>
      </div>
    </motion.section>
  );
}

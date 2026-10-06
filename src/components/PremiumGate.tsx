import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Sparkles, Loader2, AlertCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/use-premium";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";

interface PremiumGateProps {
  children: ReactNode;
  featureName: string;
  description?: string;
  perks?: string[];
}

const seenKey = (featureName: string) => `pro-preview-seen:${featureName}`;
const seen = (featureName: string) => {
  try {
    return !!localStorage.getItem(seenKey(featureName));
  } catch {
    return false;
  }
};

/**
 * Free-tier preview: first visit lets them scroll through the feature once.
 * The moment they tap to actually use it — or come back again — the page locks
 * to a minimal blurred Pro card instead of a scrollable teaser.
 */
export function PremiumGate({
  children,
  featureName,
  description = "This feature is part of Cutzioo Pro.",
}: PremiumGateProps) {
  const { loading, isPremium, error, refresh } = usePremium();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const [locked, setLocked] = useState(() => seen(featureName));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] dark:bg-[#0c0c0c]">
        <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
      </div>
    );
  }

  if (error && !isPremium) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] dark:bg-[#0c0c0c] p-6">
        <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] p-6 text-center">
          <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
          <p className="mt-2 text-[15px] font-semibold text-[#1C1C1E] dark:text-white">Something went wrong</p>
          <p className="text-sm text-[#8E8E93] mt-1">{error} Please check your connection and try again.</p>
          <Button onClick={() => refresh()} variant="outline" className="mt-4 rounded-full">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isPremium) return <>{children}</>;

  const lock = () => {
    try {
      localStorage.setItem(seenKey(featureName), "1");
    } catch {
      /* ignore */
    }
    setLocked(true);
  };

  if (locked) {
    // Minimal locked state — content is a static blurred glimpse, no scrolling.
    return (
      <div className="relative max-h-[72dvh] overflow-hidden">
        <div className="pointer-events-none select-none opacity-30 blur-[7px] saturate-[0.7]" aria-hidden>
          {children}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-full max-w-[320px] rounded-[28px] bg-[#141417]/90 backdrop-blur-2xl border border-white/[0.08] px-6 py-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF5A6E] to-[#E0152F] shadow-[0_8px_20px_rgba(255,45,70,0.35)]">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <p className="text-[17px] font-bold text-white tracking-tight">{featureName} is Pro</p>
            <p className="mt-1 text-[13px] leading-snug text-white/50">{description}</p>
            <Button
              onClick={() => {
                haptic("medium");
                navigate("/pricing");
              }}
              className="mt-5 h-11 w-full rounded-full bg-white text-black hover:bg-white/90 text-[14px] font-semibold"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Upgrade to Pro
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // First-visit preview: scrollable, but the first real tap locks it to Pro.
  return (
    <div className="relative" onClickCapture={lock}>
      {children}

      <AnimatePresence>
        {!hidden && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 w-[min(94vw,420px)]"
          >
            <div className="relative overflow-hidden rounded-[24px] p-[1px]">
              <div
                aria-hidden
                className="absolute inset-0 animate-aurora-drift"
                style={{
                  background:
                    "linear-gradient(120deg, #0A84FF, #5E5CE6 38%, #A855F7 62%, #FF4578 88%, #FF8A5A)",
                }}
              />
              <div className="relative rounded-[23px] bg-[#141417]/95 backdrop-blur-xl px-4 py-3.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-white truncate">
                    Previewing {featureName}
                  </p>
                  <p className="text-[12px] text-white/50 truncate">Tap anything to see the Pro plan</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHidden(true);
                  }}
                  aria-label="Dismiss"
                  className="h-7 w-7 shrink-0 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corner crown badge so it's clear the page is a Pro preview */}
      <div className="pointer-events-none fixed top-3 right-3 z-40 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-white/80 border border-white/10">
        <Crown className="h-3 w-3 text-rose-400" /> Pro preview
      </div>
    </div>
  );
}

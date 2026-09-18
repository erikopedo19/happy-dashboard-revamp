import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Sparkles, Lock, Loader2, AlertCircle, RefreshCw, X } from "lucide-react";
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

/**
 * Free tier can browse every page — the content stays visible but is marked
 * with a lock badge and an upgrade bar instead of being replaced by a paywall.
 */
export function PremiumGate({
  children,
  featureName,
  description = "This feature is part of Cutzioo Pro. Upgrade to unlock unlimited power.",
}: PremiumGateProps) {
  const { loading, isPremium, error, refresh } = usePremium();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);

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

  return (
    <div className="relative">
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
                <div className="h-10 w-10 shrink-0 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-white truncate">
                    {featureName} is locked
                  </p>
                  <p className="text-[12px] text-white/50 truncate">{description}</p>
                </div>
                <Button
                  onClick={() => {
                    haptic("medium");
                    navigate("/pricing");
                  }}
                  className="h-9 rounded-full bg-white text-black hover:bg-white/90 text-[13px] font-semibold px-4"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Upgrade
                </Button>
                <button
                  onClick={() => setHidden(true)}
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

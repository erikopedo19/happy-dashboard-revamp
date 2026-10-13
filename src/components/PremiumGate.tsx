import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Crown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/hooks/use-premium";
import { haptic } from "@/lib/haptics";

interface PremiumGateProps {
  children: ReactNode;
  featureName: string;
  description?: string;
  perks?: string[];
}

const TRIAL_DURATION = 10 * 60 * 1000;

function trialStorageKey(userId: string, featureName: string) {
  return `pro-trial:v2:${userId}:${featureName}`;
}

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function PremiumGate({
  children,
  featureName,
  description = "This feature is part of Cutzioo Pro.",
}: PremiumGateProps) {
  const { user, loading: authLoading } = useAuth();
  const { loading, isPremium, error, refresh } = usePremium();
  const navigate = useNavigate();
  const userId = user?.id ?? "anon";
  const storageKey = trialStorageKey(userId, featureName);
  const [trial, setTrial] = useState<{ key: string; startedAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const trialStart = trial?.key === storageKey ? trial.startedAt : null;
  const remaining = trialStart === null ? 0 : Math.max(0, TRIAL_DURATION - (now - trialStart));
  const trialActive = trialStart !== null && remaining > 0;
  const locked = !authLoading && !loading && !isPremium && !error && trialStart !== null && !trialActive;

  useEffect(() => {
    if (authLoading || loading || isPremium || error) return;

    let startedAt: number | null = null;
    const currentTime = Date.now();
    try {
      const stored = Number(window.localStorage.getItem(storageKey));
      if (Number.isFinite(stored) && stored > 0 && stored <= currentTime) {
        startedAt = stored;
      }
      if (startedAt === null) {
        startedAt = currentTime;
        window.localStorage.setItem(storageKey, String(startedAt));
      }
    } catch {
      startedAt = currentTime;
    }
    setTrial({ key: storageKey, startedAt });
    setNow(currentTime);
  }, [authLoading, error, isPremium, loading, storageKey]);

  useEffect(() => {
    if (!trialActive) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [trialActive, trialStart]);

  useEffect(() => {
    if (!locked) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [locked]);

  if (authLoading || loading || (!isPremium && !error && trialStart === null)) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F2F2F7] dark:bg-[#0c0c0c]">
        <Loader2 className="h-6 w-6 animate-spin text-[#FF2D46]" />
      </div>
    );
  }

  if (error && !isPremium) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F2F2F7] dark:bg-[#0c0c0c] p-6">
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

  if (locked && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[45] h-[100dvh] min-h-[100dvh] overflow-hidden overscroll-contain bg-[#0B0B0F]">
        <div className="pointer-events-none absolute inset-0 h-full overflow-hidden select-none" aria-hidden="true">
          <div className="h-full min-h-[100dvh] overflow-hidden blur-[7px] saturate-[0.7] opacity-35">
            {children}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[#0B0B0F]/55" aria-hidden="true" />
        <div className="relative z-10 flex h-full min-h-[100dvh] items-center justify-center px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] pb-[calc(env(safe-area-inset-bottom,0px)+6.75rem)] sm:pt-8 sm:pb-8">
          <div className="w-full max-w-[340px] rounded-[28px] bg-[#FF2D46] px-6 py-7 text-center text-white">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <p className="text-[17px] font-bold tracking-tight">{featureName} is Pro</p>
            <p className="mt-1 text-[13px] leading-snug text-white/85">{description}</p>
            <Button
              onClick={() => {
                haptic("medium");
                navigate("/pricing");
              }}
              className="mt-5 h-11 w-full rounded-full bg-white text-[#FF2D46] shadow-none text-[14px] font-semibold hover:bg-white/90"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (trialActive && typeof document !== "undefined") {
    return (
      <>
        {children}
        {createPortal(
          <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+8px)] z-[60] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full border border-white/10 bg-[#0B0B0F]/95 px-3.5 py-2 text-[12px] font-medium text-white">
            <span>Pro trial · {formatRemainingTime(remaining)} left</span>
            <Link to="/pricing" className="font-semibold text-[#FF8A98] underline-offset-2 hover:underline">
              See Pro
            </Link>
          </div>,
          document.body
        )}
      </>
    );
  }

  return <>{children}</>;
}

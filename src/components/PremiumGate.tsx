import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Sparkles, Lock, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/use-premium";
import { motion } from "framer-motion";

interface PremiumGateProps {
  children: ReactNode;
  featureName: string;
  description?: string;
  perks?: string[];
}

export function PremiumGate({
  children,
  featureName,
  description = "This feature is part of Cutzioo Pro. Upgrade to unlock unlimited power.",
  perks,
}: PremiumGateProps) {
  const { loading, isPremium } = usePremium();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] dark:bg-[#0c0c0c]">
        <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
      </div>
    );
  }

  if (isPremium) return <>{children}</>;

  const defaults = perks ?? [
    "Unlimited services & customers",
    "Teams & multi-stylist scheduling",
    "Products catalog & inventory",
    "Advanced reports & analytics",
    "Map listing & discovery",
    "Custom branding",
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] dark:bg-[#0c0c0c] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-none overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-rose-500 font-semibold">Cutzioo Pro</div>
              <div className="text-[15px] font-semibold text-[#1C1C1E] dark:text-white flex items-center gap-1.5">
                {featureName}
                <Lock className="w-3.5 h-3.5 text-[#8E8E93]" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-[#1C1C1E] dark:text-white mb-2">
            Unlock the full Cutzioo experience
          </h2>
          <p className="text-[15px] text-[#8E8E93] leading-relaxed mb-6">{description}</p>

          <ul className="space-y-3 mb-7">
            {defaults.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center mt-0.5 shrink-0">
                  <Check className="w-3 h-3 text-rose-500" strokeWidth={3} />
                </div>
                <span className="text-[14px] text-[#1C1C1E] dark:text-[#F2F2F7]">{p}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={() => navigate("/pricing")}
            className="w-full h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[15px] font-semibold shadow-[0_8px_24px_rgba(225,29,72,0.35)]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Upgrade to Pro
          </Button>
          <button
            onClick={() => navigate(-1)}
            className="w-full mt-3 text-[13px] text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white transition-colors"
          >
            Maybe later
          </button>
        </div>
      </motion.div>
    </div>
  );
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/use-premium";

export default function PricingSuccess() {
  const navigate = useNavigate();
  const { refresh, isPremium } = usePremium();

  useEffect(() => {
    // Poll for webhook to land
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      tries += 1;
      await refresh();
      if (!cancelled && !isPremium && tries < 10) {
        setTimeout(tick, 2000);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7] dark:bg-[#0c0c0c] p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:shadow-none p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 16 }}
          className="mx-auto w-20 h-20 rounded-3xl bg-rose-500 flex items-center justify-center mb-5 shadow-[0_10px_30px_rgba(225,29,72,0.4)]"
        >
          <Crown className="w-10 h-10 text-white" />
        </motion.div>

        <h1 className="text-2xl font-bold text-[#1C1C1E] dark:text-white mb-2">
          Welcome to Pro
        </h1>
        <p className="text-[15px] text-[#8E8E93] mb-6">
          {isPremium
            ? "Your subscription is active. Everything's unlocked."
            : "Finalising your subscription… this can take a few seconds."}
        </p>

        <ul className="text-left space-y-2 mb-7">
          {["Unlimited services & customers", "Teams & multi-stylist", "Reports & analytics", "Map listing & branding"].map((p) => (
            <li key={p} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center">
                <Check className="w-3 h-3 text-rose-500" strokeWidth={3} />
              </div>
              <span className="text-[14px] text-[#1C1C1E] dark:text-[#F2F2F7]">{p}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={() => navigate("/admin")}
          className="w-full h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[15px] font-semibold"
        >
          Go to dashboard
        </Button>
      </motion.div>
    </div>
  );
}

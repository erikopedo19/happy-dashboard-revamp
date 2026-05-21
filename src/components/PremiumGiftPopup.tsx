import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Sparkles, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type GiftPayload = { title: string; body: string | null };

export function PremiumGiftPopup() {
  const { user } = useAuth();
  const [gift, setGift] = useState<GiftPayload | null>(null);

  useEffect(() => {
    if (!user) return;
    const channel = (supabase as any)
      .channel(`gift:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const n = payload.new;
          if (n?.type === "premium_granted") {
            setGift({ title: n.title, body: n.body });
          }
        }
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    if (!gift) return;
    const t = setTimeout(() => setGift(null), 9000);
    return () => clearTimeout(t);
  }, [gift]);

  return (
    <AnimatePresence>
      {gift && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none px-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            onClick={() => setGift(null)}
          />
          <motion.div
            initial={{ scale: 0.6, y: 30, opacity: 0, rotate: -4 }}
            animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative pointer-events-auto w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: "linear-gradient(135deg,#1a1a1a 0%,#2a1f15 60%,#3a2a1a 100%)" }}
          >
            {/* sparkles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 40, x: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 0], y: -80, x: (i % 2 ? 1 : -1) * (10 + i * 6), scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 1.6, repeat: Infinity, repeatDelay: 1.2 }}
                  className="absolute bottom-10 left-1/2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300/90" />
                </motion.span>
              ))}
            </div>

            <div className="relative p-7 text-center text-white">
              <motion.div
                initial={{ y: -8, scale: 0.9 }}
                animate={{ y: [0, -6, 0], scale: 1 }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                style={{ background: "linear-gradient(135deg,#e0c4a8,#b8895f)" }}
              >
                <Gift className="w-10 h-10 text-[#1a1a1a]" />
              </motion.div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-[11px] font-medium uppercase tracking-wider mb-2">
                <Crown className="w-3 h-3" /> A gift from Cutzioo
              </div>
              <h2 className="text-xl font-semibold leading-tight">{gift.title}</h2>
              {gift.body && (
                <p className="mt-2 text-sm text-white/70 leading-relaxed">{gift.body}</p>
              )}
              <button
                onClick={() => setGift(null)}
                className="mt-5 w-full py-3 rounded-2xl bg-white text-[#1a1a1a] font-semibold text-sm hover:bg-white/90 transition"
              >
                Awesome, thanks 🎉
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PremiumGiftPopup;

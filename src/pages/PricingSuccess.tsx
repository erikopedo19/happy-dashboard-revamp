import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { usePremium } from "@/hooks/use-premium";

const COLORS = ["#22c55e", "#f43f5e", "#f59e0b", "#3b82f6", "#22c55e", "#a855f7", "#ec4899"];

export default function PricingSuccess() {
  const navigate = useNavigate();
  const { refresh, isPremium } = usePremium();
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(5);
  const doneRef = useRef(done);
  const premiumRef = useRef(isPremium);
  const refreshRef = useRef(refresh);
  doneRef.current = done;
  premiumRef.current = isPremium;
  refreshRef.current = refresh;

  useEffect(() => {
    let tries = 0;
    const started = Date.now();
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (doneRef.current || premiumRef.current) return setDone(true);
      tries += 1;
      await refreshRef.current();
      if (premiumRef.current || tries >= 5 || Date.now() - started >= 4000) return setDone(true);
      t = setTimeout(tick, 800);
    };
    tick();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!done) return;
    if (count <= 0) {
      navigate("/dashboard", { replace: true });
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, count, navigate]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        size: 6 + Math.random() * 7,
        rotate: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        round: i % 3 === 0,
      })),
    [],
  );

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#0B0B0E]">
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_0%,rgba(34,197,94,0.55),rgba(11,11,14,0)_72%)]" />

      {confetti.map((c) => (
          <motion.span
            key={c.id}
            className={c.round ? "absolute rounded-full" : "absolute rounded-[2px]"}
            style={{
              left: `${c.left}%`,
              top: -20,
              width: c.size,
              height: c.round ? c.size : c.size * 0.55,
              backgroundColor: c.color,
            }}
            initial={{ y: -30, rotate: c.rotate, opacity: 1 }}
            animate={{ y: "110vh", rotate: c.rotate + 540, opacity: 0.9 }}
            transition={{ duration: 2.4 + Math.random(), delay: c.delay, ease: "easeIn" }}
          />
        ))}

      <div className="relative h-full flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="w-[92px] h-[92px] rounded-full bg-[#22c55e] flex items-center justify-center shadow-[0_16px_50px_rgba(34,197,94,0.45)]"
        >
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </motion.div>

        <motion.h1
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 240, damping: 26 }}
          className="mt-7 text-[34px] font-bold tracking-tight text-white"
        >
          You are all set
        </motion.h1>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-2 text-[15px] text-white/45"
        >
          {done
            ? isPremium
              ? "Cutzioo Pro activated. Redirecting…"
              : "Payment received. Finalising your plan…"
            : "Confirming your payment…"}
        </motion.p>

        {done && (
          <motion.button
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={() => navigate("/dashboard", { replace: true })}
            className="mt-8 rounded-full bg-white/[0.08] px-6 py-3 text-[15px] font-semibold text-white active:scale-95 transition"
          >
            Continue to dashboard ({count})
          </motion.button>
        )}
      </div>
    </div>
  );
}

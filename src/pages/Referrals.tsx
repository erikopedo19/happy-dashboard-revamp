import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Copy,
  Gift,
  Link2,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Share your link", body: "Send it to barbers and shop owners you know." },
  { title: "They join Cutzio", body: "They create an account with your link." },
  { title: "You get a free month", body: "30 days of Pro added instantly — every time." },
];

export default function Referrals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [{ data: c }, { count: n }] = await Promise.all([
        supabase.rpc("get_my_referral_code"),
        supabase
          .from("referrals")
          .select("id", { count: "exact", head: true })
          .eq("referrer_id", user.id),
      ]);
      if (!alive) return;
      setCode((c as string) ?? null);
      setCount(n ?? 0);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const link = code ? `${window.location.origin}/auth?ref=${code}` : "";

  const copy = async () => {
    if (!link) return;
    haptic("medium");
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 1800);
  };

  const share = async () => {
    if (!link) return;
    haptic("light");
    const payload = {
      title: "Join me on Cutzio",
      text: "Run your barbershop bookings with Cutzio — use my link to join.",
      url: link,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        /* cancelled */
      }
    }
    copy();
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black pb-28">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-b-[36px] bg-[#0B0B0C] px-5 pb-10 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-rose-500/40 blur-[90px]" />
        <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-[90px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-[80px]" />

        <button
          onClick={() => navigate(-1)}
          className="relative z-10 -ml-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative z-10 mx-auto mt-4 flex h-[74px] w-[74px] items-center justify-center rounded-[24px] bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_10px_40px_-10px_rgba(244,63,94,0.8)]"
        >
          <Gift className="h-8 w-8 text-white" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 240, damping: 24 }}
          className="relative z-10 mt-5 text-center text-[30px] font-bold leading-[1.1] tracking-tight text-white"
        >
          Invite a barber,
          <br />
          get a free month
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 240, damping: 24 }}
          className="relative z-10 mx-auto mt-2 max-w-[300px] text-center text-[14px] text-white/60"
        >
          Every person who joins with your link adds 30 days of Pro to your plan.
        </motion.p>
      </div>

      <div className="mx-auto -mt-6 w-full max-w-lg space-y-4 px-4">
        {/* Code card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, type: "spring", stiffness: 240, damping: 24 }}
          className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.5)] dark:border-white/[0.07] dark:bg-[#1C1C1E]"
        >
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8E8E93]">
            <Link2 className="h-3.5 w-3.5" /> Your invite code
          </div>

          <div className="mt-3 flex items-center justify-center rounded-2xl border border-dashed border-rose-300/70 bg-rose-500/[0.06] py-5 dark:border-rose-400/30">
            <span className="font-mono text-[30px] font-bold tracking-[0.28em] text-[#1C1C1E] dark:text-white">
              {loading ? "······" : code ?? "—"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={copy}
              disabled={!link}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-black/[0.07] bg-[#F2F2F7] text-[15px] font-semibold text-[#1C1C1E] transition active:scale-[0.98] disabled:opacity-50 dark:border-white/[0.08] dark:bg-[#2C2C2E] dark:text-white"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              onClick={share}
              disabled={!link}
              className="relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(244,63,94,0.9)] transition active:scale-[0.98] disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>

          {link && (
            <p className="mt-3 truncate text-center text-[12px] text-[#8E8E93]">{link}</p>
          )}
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19, type: "spring", stiffness: 240, damping: 24 }}
          className="grid grid-cols-2 gap-3"
        >
          <Stat icon={Users} tint="#0A84FF" value={count} label="Friends joined" />
          <Stat icon={Sparkles} tint="#FF375F" value={count} label="Free months earned" />
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, type: "spring", stiffness: 240, damping: 24 }}
          className="rounded-[28px] border border-black/[0.06] bg-white p-5 dark:border-white/[0.07] dark:bg-[#1C1C1E]"
        >
          <p className="text-[17px] font-semibold text-[#1C1C1E] dark:text-white">How it works</p>
          <div className="mt-4 space-y-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white",
                      "bg-gradient-to-br from-rose-400 to-rose-600",
                    )}
                  >
                    {i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="mt-1 w-px flex-1 bg-black/[0.08] dark:bg-white/[0.1]" />
                  )}
                </div>
                <div className="pb-1">
                  <p className="text-[15px] font-semibold text-[#1C1C1E] dark:text-white">{s.title}</p>
                  <p className="text-[13.5px] text-[#8E8E93]">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="px-2 text-center text-[12px] leading-relaxed text-[#8E8E93]">
          The free month is added automatically when a new account signs up with your link.
          One reward per new account.
        </p>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  tint,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-[24px] border border-black/[0.06] bg-white p-4 dark:border-white/[0.07] dark:bg-[#1C1C1E]">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-[12px]"
        style={{ background: `${tint}1F` }}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-3 text-[26px] font-bold leading-none text-[#1C1C1E] dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-[13px] text-[#8E8E93]">{label}</p>
    </div>
  );
}

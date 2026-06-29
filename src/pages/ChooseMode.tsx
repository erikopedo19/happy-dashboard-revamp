import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, Search, Loader2, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { triggerGlimm } from "@/components/GlimmIntercept";

export const MODE_CHOICE_KEY = "cutzio:mode-choice";

type Mode = "barber" | "client";

export default function ChooseMode() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const next = params.get("next");

  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState<Mode | null>(null);

  const pick = async (mode: Mode) => {
    if (loading) return;
    setLoading(mode);
    try {
      if (user) {
        try {
          await supabase.auth.updateUser({ data: { role: mode } });
          await (supabase as any)
            .from("profiles")
            .update({ role: mode, updated_at: new Date().toISOString() })
            .eq("id", user.id);
        } catch {}
      }
      if (remember) {
        try { localStorage.setItem(MODE_CHOICE_KEY, mode); } catch {}
      } else {
        try { localStorage.removeItem(MODE_CHOICE_KEY); } catch {}
      }
      const dest = next && next !== "/" ? next : mode === "client" ? "/find-barber" : "/admin";
      triggerGlimm({ sweepMs: 700, outroMs: 380 });
      setTimeout(() => navigate(dest, { replace: true }), 280);
    } catch (e: any) {
      toast({ title: "Couldn't continue", description: e?.message, variant: "destructive" });
      setLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#f5f5f7] dark:bg-[#0a0a0c] text-foreground flex items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[460px]"
      >
        <div className="rounded-[32px] bg-white dark:bg-[#141418] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25)] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-black/5 dark:ring-white/[0.06] px-7 pb-8 pt-9 sm:px-9">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0A84FF]/10 ring-1 ring-[#0A84FF]/20">
              <img src="/cutzioo-logo.webp" alt="" className="h-7 w-7 rounded-[8px]" />
            </div>
            <h1 className="font-cal text-[28px] leading-tight tracking-tight">How will you use Cutzioo?</h1>
            <p className="mt-1.5 text-[14px] text-foreground/55">Pick a mode to continue. You can change it anytime in Settings.</p>
          </div>

          <div className="mt-7 space-y-3">
            <ModeCard
              icon={<Scissors className="h-5 w-5" />}
              title="I'm a barber"
              subtitle="Manage bookings, clients & your shop"
              onClick={() => pick("barber")}
              loading={loading === "barber"}
              disabled={loading !== null}
            />
            <ModeCard
              icon={<Search className="h-5 w-5" />}
              title="I'm a client"
              subtitle="Find a barber and book a cut"
              onClick={() => pick("client")}
              loading={loading === "client"}
              disabled={loading !== null}
            />
          </div>

          <button
            type="button"
            onClick={() => setRemember((v) => !v)}
            className="mt-6 flex w-full items-center gap-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] px-4 py-3 text-left transition hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-md transition ${
                remember ? "bg-[#0A84FF] text-white" : "bg-black/10 dark:bg-white/10 text-transparent"
              }`}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <span className="text-[13px] font-medium text-foreground/80">Remember my choice</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  subtitle,
  onClick,
  loading,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center gap-4 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] px-4 py-4 text-left ring-1 ring-transparent transition hover:bg-white dark:hover:bg-white/[0.08] hover:ring-[#0A84FF]/40 hover:shadow-[0_0_0_4px_rgba(10,132,255,0.10)] disabled:opacity-60"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A84FF]/10 text-[#0A84FF] ring-1 ring-[#0A84FF]/20">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-[15px] font-semibold text-foreground">{title}</span>
        <span className="block text-[12.5px] text-foreground/55">{subtitle}</span>
      </span>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-foreground/60" />
      ) : (
        <span className="text-foreground/40 transition group-hover:translate-x-0.5">→</span>
      )}
    </button>
  );
}

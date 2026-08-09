import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Search, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const KEY = "cutzio:find-barber-prompt-dismissed";

/**
 * One-time prompt shown after signup: every new user defaults to the
 * barber dashboard. If they're actually here to *book* a cut, this lets
 * them switch role to client and jump to /find-barber.
 */
export function FindBarberPrompt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      if (localStorage.getItem(KEY) === "1") return;
    } catch {}
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [user]);

  const dismiss = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setOpen(false);
  };

  const switchToClient = async () => {
    if (!user) return;
    setSwitching(true);
    try {
      await supabase.auth.updateUser({ data: { role: "client" } });
      try {
        await (supabase as any)
          .from("profiles")
          .update({ role: "client", updated_at: new Date().toISOString() })
          .eq("id", user.id);
      } catch {}
      try { localStorage.setItem(KEY, "1"); } catch {}
      toast({ title: "Switched to client mode" });
      navigate("/find-barber", { replace: true });
    } catch (e: any) {
      toast({ title: "Couldn't switch", description: e?.message, variant: "destructive" });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl bg-gradient-to-br from-white/15 via-white/5 to-white/10 p-px shadow-2xl shadow-black/50"
          >
            <div className="relative rounded-[23px] bg-[#0b0b0d]/95 backdrop-blur-2xl p-6 text-white">
              <button
                onClick={dismiss}
                className="absolute right-3 top-3 rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-[#FF2D6F] to-[#0A84FF] flex items-center justify-center shadow-lg shadow-[#FF2D6F]/30">
                  <Scissors className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="font-cal text-xl tracking-tight">Welcome to Cutzioo</h2>
                  <p className="text-xs text-white/60">Pick how you'll use the app</p>
                </div>
              </div>

              <p className="text-sm text-white/70 mb-5 leading-relaxed">
                You're set up as a <span className="text-white font-medium">barber</span> by default —
                this is your shop dashboard. Just here to <span className="text-white font-medium">book a cut</span>?
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={switchToClient}
                  disabled={switching}
                  className="group flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#FF2D6F] to-[#0A84FF] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#FF2D6F]/30 transition hover:opacity-95 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Find me a barber instead
                  </span>
                  {switching ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs opacity-80">→</span>}
                </button>
                <button
                  onClick={dismiss}
                  className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
                >
                  Stay on barber dashboard
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

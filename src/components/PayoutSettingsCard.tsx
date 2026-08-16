import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Banknote, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Status = {
  stripe_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
};

export function PayoutSettingsCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("stripe-connect", {
      body: { action: "status" },
    });
    if (!error && data) setStatus(data as Status);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (action: "onboard" | "dashboard") => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action, return_url: `${window.location.origin}/settings` },
      });
      
      if (error) {
        console.error("Stripe function error:", error);
        toast({ 
          title: "Couldn't open Stripe", 
          description: error.message || "Please try again in a moment.", 
          variant: "destructive" 
        });
        return;
      }
      
      if (!data?.url) {
        console.error("No URL returned from stripe-connect:", data);
        toast({ 
          title: "Couldn't open Stripe", 
          description: "No URL returned from Stripe service. Please contact support.", 
          variant: "destructive" 
        });
        return;
      }
      
      window.location.href = data.url;
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({ 
        title: "Couldn't open Stripe", 
        description: "An unexpected error occurred. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setBusy(false);
    }
  };

  const ready = !!status?.charges_enabled && !!status?.payouts_enabled;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] bg-[#15151A] border border-white/[0.06] p-5"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
          <Banknote className="w-5 h-5 text-rose-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15.5px] font-semibold text-white">Payouts</h3>
          <p className="text-[13px] text-white/45 mt-0.5">
            Connect your own Stripe account to get paid directly for bookings and products. Sales tax is calculated
            automatically at checkout, and a flat $0.25 platform fee is deducted from each payout.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="h-11 rounded-2xl bg-white/[0.03] animate-pulse" />
        ) : (
          <>
            <div
              className={cn(
                "flex items-center gap-2 rounded-2xl px-3.5 py-3 text-[13px]",
                ready ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"
              )}
            >
              {ready ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {ready
                ? "Your account is active — payments and payouts are enabled."
                : status?.stripe_account_id
                ? "Onboarding is incomplete. Finish the Stripe steps to start receiving payouts."
                : "No payout account connected yet."}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => run("onboard")}
                disabled={busy}
                className="h-11 px-5 rounded-full bg-rose-500 text-white text-[14.5px] font-semibold active:scale-[0.98] transition disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : ready ? "Update details" : "Connect Stripe"}
              </button>
              {ready && (
                <button
                  onClick={() => run("dashboard")}
                  disabled={busy}
                  className="h-11 px-5 rounded-full bg-white/[0.06] text-white/80 text-[14.5px] font-medium flex items-center gap-1.5 active:scale-[0.98] transition"
                >
                  Stripe dashboard <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

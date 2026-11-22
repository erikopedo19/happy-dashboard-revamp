import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const emailSchema = z.string().trim().email().max(254);

/**
 * Barbers paste the email of their own PayPal account. Clients who pick PayPal on the
 * booking page pay that account directly — Cutzioo never holds the money.
 */
export function PayPalPayoutCard() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState<{ email: string; enabled: boolean }>({ email: "", enabled: false });
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id ?? null;
      setUserId(id);
      if (id) {
        const { data } = await (supabase as any)
          .from("profiles")
          .select("paypal_email, paypal_enabled")
          .eq("id", id)
          .maybeSingle();
        const e = data?.paypal_email ?? "";
        setEmail(e);
        setEnabled(!!data?.paypal_enabled);
        setSaved({ email: e, enabled: !!data?.paypal_enabled });
      }
      setLoading(false);
    })();
  }, []);

  const valid = emailSchema.safeParse(email).success;
  const dirty = email.trim() !== saved.email || enabled !== saved.enabled;

  const save = async () => {
    if (!userId || busy) return;
    const trimmed = email.trim();
    if (trimmed && !valid) {
      toast({ title: "Check your PayPal email", description: "Enter the email address of your PayPal account.", variant: "destructive" });
      return;
    }
    const nextEnabled = enabled && !!trimmed;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ paypal_email: trimmed || null, paypal_enabled: nextEnabled })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't save PayPal", description: "Please try again.", variant: "destructive" });
      return;
    }
    setEnabled(nextEnabled);
    setSaved({ email: trimmed, enabled: nextEnabled });
    toast({
      title: nextEnabled ? "PayPal is on" : "PayPal saved",
      description: nextEnabled ? "Clients can now pay you with PayPal on your booking link." : "PayPal is off on your booking link.",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] bg-[#15151A] border border-white/[0.06] p-5"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-sky-500/10 flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5 text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15.5px] font-semibold text-white">PayPal</h3>
          <p className="text-[13px] text-white/45 mt-0.5">
            Let clients pay with PayPal on your booking link. Money goes straight to your own PayPal account — no Cutzioo fee.
          </p>
        </div>
        {saved.enabled && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-label="PayPal is on" />}
      </div>

      {loading ? (
        <div className="mt-4 h-11 rounded-2xl bg-white/[0.03] animate-pulse" />
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[12.5px] text-white/50">PayPal account email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourshop.com"
              className="mt-1.5 w-full h-11 rounded-2xl bg-white/[0.05] border border-white/[0.06] px-4 text-[16px] text-white placeholder:text-white/25 outline-none focus:border-sky-400/60"
            />
          </label>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3">
            <span className="text-[14px] text-white/85">Accept PayPal on bookings</span>
            <Switch checked={enabled} disabled={!valid} onCheckedChange={setEnabled} aria-label="Accept PayPal on bookings" />
          </div>
          <button
            onClick={save}
            disabled={!dirty || busy}
            className={cn(
              "h-11 px-5 rounded-full text-[14.5px] font-semibold active:scale-[0.98] transition flex items-center gap-2",
              dirty ? "bg-white text-black" : "bg-white/[0.06] text-white/40",
            )}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save PayPal
          </button>
          <p className="text-[11.5px] leading-[1.5] text-white/35">
            Use a PayPal Business account that can receive payments. You are the seller: refunds and receipts are handled
            in your PayPal account.
          </p>
        </div>
      )}
    </motion.div>
  );
}

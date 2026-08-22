import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Banknote,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { RevenuePipelineCard } from "@/components/reports/RevenuePipelineCard";

type Status = {
  stripe_account_id: string | null;
  connected?: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
};

type Txn = {
  id: string;
  amount: number;
  net: number;
  currency: string;
  type: string;
  description: string | null;
  created: number;
};

type Balance = {
  connected: boolean;
  currency: string;
  available: number;
  pending: number;
  recent_net: number;
  payouts: { id: string; amount: number; currency: string; status: string; arrival_date: number }[];
  transactions: Txn[];
};

const symbolFor = (c?: string) =>
  ({ usd: "$", eur: "€", gbp: "£", chf: "CHF ", pln: "zł ", ron: "lei " } as Record<string, string>)[
    (c || "usd").toLowerCase()
  ] ?? "$";

/** Big number with a muted decimal tail, like the reference analytics screen. */
function BigAmount({ value, currency }: { value: number; currency?: string }) {
  const [whole, dec] = Math.abs(value).toFixed(2).split(".");
  const grouped = Number(whole).toLocaleString();
  return (
    <div className="flex items-baseline tracking-tight">
      <span className="text-[38px] font-bold text-white leading-none">
        {symbolFor(currency)}
        {grouped}
      </span>
      <span className="text-[38px] font-bold text-white/30 leading-none">.{dec}</span>
    </div>
  );
}

export function PayoutSettingsCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [tab, setTab] = useState<"earnings" | "payouts">("earnings");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "status" },
      });

      if (error) {
        console.error("Failed to load Stripe status:", error);
        toast({
          title: "Connection Error",
          description: "Could not check Stripe status. Please try again.",
          variant: "destructive",
        });
      } else if (data) {
        setStatus(data as Status);
        if ((data as Status).charges_enabled) {
          const { data: bal } = await supabase.functions.invoke("stripe-connect", {
            body: { action: "balance" },
          });
          if (bal && !(bal as any).error) setBalance(bal as Balance);
        }
      }
    } catch (err) {
      console.error("Unexpected error loading status:", err);
    } finally {
      setLoading(false);
    }
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
        toast({
          title: "Couldn't open Stripe",
          description: error.message || "Please try again in a moment.",
          variant: "destructive",
        });
        return;
      }

      if (data?.requires_connect_activation && data?.setup_url) {
        toast({
          title: "Activate Stripe Connect",
          description: "Complete Stripe's Connect setup, then return here to connect payouts.",
        });
        window.location.href = data.setup_url;
        return;
      }

      if (!data?.url) {
        toast({
          title: "Couldn't open Stripe",
          description: "No URL returned from Stripe. Please try again.",
          variant: "destructive",
        });
        return;
      }

      window.location.href = data.url;
    } catch {
      toast({ title: "Couldn't open Stripe", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const ready = !!status?.charges_enabled && !!status?.payouts_enabled;
  const cur = balance?.currency;

  return (
    <div className="space-y-4">
    <RevenuePipelineCard compact />
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
          <h3 className="text-[15.5px] font-semibold text-white">Payments & payouts</h3>
          <p className="text-[13px] text-white/45 mt-0.5">
            Money from card bookings goes straight to your own Stripe account. Sales tax is calculated automatically and a
            flat $0.25 platform fee is deducted per transaction.
          </p>
        </div>
        {ready && (
          <button
            onClick={load}
            aria-label="Refresh balance"
            className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 active:scale-95 transition"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-11 rounded-2xl bg-white/[0.03] animate-pulse" />
            <div className="h-24 rounded-[22px] bg-white/[0.03] animate-pulse" />
          </div>
        ) : (
          <>
            {ready && balance ? (
              <>
                {/* Segmented tabs */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-white/[0.05]">
                  {(["earnings", "payouts"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={cn(
                        "relative h-9 rounded-full text-[13.5px] font-medium capitalize transition-colors",
                        tab === t ? "text-black" : "text-white/50"
                      )}
                    >
                      {tab === t && (
                        <motion.span
                          layoutId="payout-tab"
                          transition={{ type: "spring", stiffness: 480, damping: 38 }}
                          className="absolute inset-0 rounded-full bg-white"
                        />
                      )}
                      <span className="relative z-10">{t}</span>
                    </button>
                  ))}
                </div>

                {tab === "earnings" ? (
                  <div className="mt-4">
                    <p className="text-[13px] text-white/45">Available balance</p>
                    <div className="mt-1.5 flex items-end justify-between gap-3">
                      <BigAmount value={balance.available} currency={cur} />
                      {balance.pending > 0 && (
                        <span className="text-[12.5px] text-emerald-400 mb-1">
                          {symbolFor(cur)}
                          {balance.pending.toFixed(2)} pending
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                        <p className="text-[12px] text-white/45">On the way</p>
                        <p className="text-[16px] font-semibold text-white tabular-nums mt-0.5">
                          {symbolFor(cur)}
                          {balance.pending.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
                        <p className="text-[12px] text-white/45">Recent net</p>
                        <p className="text-[16px] font-semibold text-white tabular-nums mt-0.5">
                          {symbolFor(cur)}
                          {balance.recent_net.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-5 text-[13px] font-semibold text-white">Transaction history</p>
                    <div className="mt-2 space-y-1">
                      {balance.transactions.length === 0 && (
                        <p className="text-[13px] text-white/40 py-3">No transactions yet.</p>
                      )}
                      {balance.transactions.map((t) => {
                        const positive = t.amount >= 0;
                        return (
                          <div key={t.id} className="flex items-center gap-3 py-2.5">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                                positive ? "bg-emerald-500/10" : "bg-rose-500/10"
                              )}
                            >
                              {positive ? (
                                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-rose-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] text-white truncate">
                                {t.description || t.type.replace(/_/g, " ")}
                              </p>
                              <p className="text-[12px] text-white/40">
                                {new Date(t.created * 1000).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="text-[14px] font-semibold text-white tabular-nums shrink-0">
                              {symbolFor(t.currency)}
                              {Math.abs(t.amount).toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-1">
                    {balance.payouts.length === 0 && (
                      <p className="text-[13px] text-white/40 py-3">No payouts sent yet.</p>
                    )}
                    {balance.payouts.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 py-2.5">
                        <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                          <Banknote className="w-4 h-4 text-white/70" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] text-white capitalize">{p.status}</p>
                          <p className="text-[12px] text-white/40">
                            {new Date(p.arrival_date * 1000).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-[14px] font-semibold text-white tabular-nums">
                          {symbolFor(p.currency)}
                          {p.amount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
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
            )}

            <div className="mt-4 flex flex-wrap gap-2">
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

            <p className="mt-3 text-[11.5px] leading-[1.5] text-white/35">
              Balances are read directly from your connected Stripe account and shown read-only. Cutzioo never moves or
              holds your money — payouts are made by Stripe on your own payout schedule.
            </p>
          </>
        )}
      </div>
    </motion.div>
    </div>
  );
}

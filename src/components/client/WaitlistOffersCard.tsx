import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BellRing, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import { notifyNow } from "@/lib/nativeNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface WaitlistOffer {
  id: string;
  status: "waiting" | "offered" | string;
  barber_id: string;
  barber_name?: string | null;
  avatar_url?: string | null;
  brand_color?: string | null;
  claim_token?: string | null;
  offered_appointment_id?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  offer_expires_at?: string | null;
  created_at?: string;
  queue_position?: number;
}

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

function useSecondClock(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export function WaitlistOffersCard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: offers = [] } = useQuery<WaitlistOffer[]>({
    queryKey: ["my-waitlist-offers", user?.id],
    enabled: !!user,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_waitlist_offers");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`waitlist-offers-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cancellation_waitlist", filter: `client_user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["my-waitlist-offers", user.id] })
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: { new?: { id?: string; type?: string; body?: string | null } }) => {
          if (payload.new?.type === "waitlist_offer") {
            haptic("warning");
            qc.invalidateQueries({ queryKey: ["my-waitlist-offers", user.id] });
            void notifyNow("A slot just opened", payload.new.body || "Claim it before the offer moves on.", payload.new.id);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, user]);

  if (!offers.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="rounded-[28px] border border-black/[0.05] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/[0.07] dark:bg-[#1C1C1E]"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-rose-500/10">
          <BellRing className="h-4 w-4 text-rose-500" />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">Cancellation alerts</h2>
          <p className="text-[11px] text-[#8E8E93]">First claim gets the reopened slot</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {offers.map((offer, index) => (
          <OfferRow key={offer.id} offer={offer} index={index} />
        ))}
      </div>
    </motion.section>
  );
}

function OfferRow({ offer, index }: { offer: WaitlistOffer; index: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [claiming, setClaiming] = useState(false);
  const active = offer.status === "offered" && !!offer.claim_token;
  const now = useSecondClock(active);
  const expiresAt = offer.offer_expires_at ? new Date(offer.offer_expires_at).getTime() : 0;
  const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const progress = Math.min(1, secondsLeft / 600);
  const accent = offer.brand_color || "#e11d48";

  useEffect(() => {
    if (!active || secondsLeft > 0) return;
    qc.invalidateQueries({ queryKey: ["my-waitlist-offers"] });
  }, [active, qc, secondsLeft]);

  const claim = async () => {
    if (!offer.claim_token || claiming) return;
    haptic("medium");
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_waitlist_offer", {
      _token: offer.claim_token,
    });
    setClaiming(false);
    const result = data as { success?: boolean; error?: string } | null;
    if (error || !result?.success) {
      haptic("error");
      toast({ title: "Couldn't claim slot", description: result?.error || error?.message, variant: "destructive" });
      return;
    }
    haptic("success");
    toast({ title: "Slot claimed", description: "The cancelled appointment is now yours." });
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["my-bookings"] }),
      qc.invalidateQueries({ queryKey: ["my-waitlist-offers"] }),
    ]);
  };

  const label = useMemo(() => {
    if (active) {
      const minutes = Math.floor(secondsLeft / 60);
      const seconds = String(secondsLeft % 60).padStart(2, "0");
      return `${minutes}:${seconds} left`;
    }
    return `You're #${offer.queue_position || 1} in line`;
  }, [active, offer.queue_position, secondsLeft]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: Math.min(index, 5) * 0.04 }}
      className={cn(
        "overflow-hidden rounded-[22px] border p-3",
        active
          ? "border-rose-500/25 bg-rose-500/[0.06]"
          : "border-black/[0.05] bg-[#F2F2F7] dark:border-white/[0.06] dark:bg-[#2C2C2E]"
      )}
    >
      <div className="flex items-center gap-3">
        {offer.avatar_url ? (
          <img
            src={offer.avatar_url}
            alt={offer.barber_name || "Barber"}
            className="h-11 w-11 rounded-[14px] object-cover"
            loading="lazy"
            width={44}
            height={44}
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] text-white" style={{ backgroundColor: accent }}>
            {(offer.barber_name || "B").charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
            {active ? "Slot opened" : offer.barber_name || "Waitlist"}
          </div>
          <div className="truncate text-[11px] text-[#8E8E93]">
            {active
              ? `${offer.barber_name || "Your barber"} · ${offer.appointment_date ? format(new Date(`${offer.appointment_date}T12:00:00`), "EEE, MMM d") : "soon"} ${offer.appointment_time ? `· ${String(offer.appointment_time).slice(0, 5)}` : ""}`
              : `at ${offer.barber_name || "your barber"}`}
          </div>
        </div>
        {active ? (
          <button
            type="button"
            onClick={claim}
            disabled={claiming || secondsLeft === 0}
            className="flex h-10 min-w-[86px] items-center justify-center rounded-[14px] px-3 text-[13px] font-semibold text-white transition active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim it"}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-[#8E8E93] dark:bg-white/[0.08]">
            <Clock3 className="h-3.5 w-3.5" />
            {label}
          </div>
        )}
      </div>

      {active && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
            <motion.div
              className="h-full origin-left rounded-full bg-rose-500"
              animate={{ scaleX: progress }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-rose-600 dark:text-rose-300">
            <span>Claim window</span>
            <span className="tabular-nums">{label}</span>
          </div>
        </div>
      )}

      {active && secondsLeft === 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#8E8E93]">
          <CheckCircle2 className="h-3.5 w-3.5" /> Checking the next person…
        </div>
      )}
    </motion.div>
  );
}

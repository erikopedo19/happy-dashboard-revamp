import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@heroui/react";
import { CheckCircle2, XCircle, Sparkles, Clock } from "lucide-react";
import { CutziooLoader } from "@/components/CutziooLoader";
import { haptic } from "@/lib/haptics";

interface OfferInfo {
  status: string;
  offer_expires_at: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  barber_name?: string | null;
}

export default function WaitlistClaim() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ready" | "claimed" | "error">("loading");
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<OfferInfo | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return setState("error");
      const { data, error } = await (supabase.rpc as any)("get_waitlist_offer", { _token: token });
      const offer = data?.[0] as OfferInfo | undefined;
      if (error || !offer) {
        setError("Offer not found");
        setState("error");
        return;
      }
      if (offer.status !== "offered") {
        setError(
          offer.status === "claimed"
            ? "This offer was already claimed."
            : "This offer is no longer available."
        );
        setState("error");
        return;
      }
      const expiresAt = new Date(offer.offer_expires_at || 0).getTime();
      if (expiresAt < Date.now()) {
        setError("This offer has expired.");
        setState("error");
        return;
      }
      setInfo(offer);
      setState("ready");
    })();
  }, [token]);

  useEffect(() => {
    if (state !== "ready" || !info) return;
    const tick = () => {
      const expiresAt = info.offer_expires_at ? new Date(info.offer_expires_at).getTime() : 0;
      const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        setError("This offer has expired.");
        setState("error");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state, info]);

  const claim = async () => {
    if (claiming) return;
    haptic("medium");
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_waitlist_offer", { _token: token });
    const result = data as { success?: boolean; error?: string } | null;
    setClaiming(false);
    if (error || !result?.success) {
      haptic("error");
      setError(result?.error || error?.message || "Could not claim");
      setState("error");
      return;
    }
    haptic("success");
    setState("claimed");
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-[#0b0b0d] via-[#141417] to-[#2b0a14] flex items-center justify-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border border-white/20"
      >
        {state === "loading" && (
          <div className="text-center py-10">
            <CutziooLoader variant="loop" size="56px" wordmark={false} />
          </div>
        )}

        {state === "ready" && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">A slot just opened!</h1>
              <p className="text-sm text-zinc-600 mt-2">
                You're first in line. You have 10 minutes before the offer rolls to the next person.
              </p>
              {info?.barber_name && (
                <p className="mt-3 rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700">
                  {info.barber_name}
                  {info.appointment_date ? ` · ${info.appointment_date}` : ""}
                  {info.appointment_time ? ` · ${String(info.appointment_time).slice(0, 5)}` : ""}
                </p>
              )}
            </div>
            {secondsLeft !== null && (
              <div className="flex items-center justify-center gap-2 text-rose-600 font-semibold">
                <Clock className="w-4 h-4" />
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} left
              </div>
            )}
            <Button
              onPress={claim}
              isDisabled={claiming}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold border-0 hover:opacity-90 active:scale-[0.98]"
            >
              {claiming ? "Claiming…" : "Claim this slot"}
            </Button>
          </div>
        )}

        {state === "claimed" && (
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
            <h1 className="text-2xl font-bold text-zinc-900">Slot claimed!</h1>
            <p className="text-sm text-zinc-600">
              The barber has been notified. They'll reach out to confirm the booking.
            </p>
            <Button onPress={() => navigate("/my-bookings")} className="rounded-2xl">
              View my bookings
            </Button>
          </div>
        )}

        {state === "error" && (
          <div className="text-center space-y-4">
            <XCircle className="w-16 h-16 mx-auto text-rose-500" />
            <h1 className="text-xl font-bold text-zinc-900">Unavailable</h1>
            <p className="text-sm text-zinc-600">{error}</p>
            <Button variant="bordered" onPress={() => navigate("/find-barber")} className="rounded-2xl">
              Find another barber
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

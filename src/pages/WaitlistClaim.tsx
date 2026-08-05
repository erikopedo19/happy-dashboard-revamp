import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@heroui/react";
import { Loader2, CheckCircle2, XCircle, Sparkles, Clock } from "lucide-react";

export default function WaitlistClaim() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ready" | "claimed" | "error">("loading");
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<any>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) return setState("error");
      const { data, error } = await (supabase as any)
        .from("cancellation_waitlist")
        .select("status, offer_expires_at, barber_id, offered_appointment_id")
        .eq("claim_token", token)
        .maybeSingle();
      if (error || !data) {
        setError("Offer not found");
        setState("error");
        return;
      }
      if (data.status !== "offered") {
        setError(
          data.status === "claimed"
            ? "This offer was already claimed."
            : "This offer is no longer available."
        );
        setState("error");
        return;
      }
      const expiresAt = new Date(data.offer_expires_at).getTime();
      if (expiresAt < Date.now()) {
        setError("This offer has expired.");
        setState("error");
        return;
      }
      setInfo(data);
      setState("ready");
    })();
  }, [token]);

  useEffect(() => {
    if (state !== "ready" || !info) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(info.offer_expires_at).getTime() - Date.now()) / 1000));
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
    const { data, error } = await (supabase as any).rpc("claim_waitlist_offer", { _token: token });
    if (error || !data?.success) {
      setError(data?.error || error?.message || "Could not claim");
      setState("error");
      return;
    }
    setState("claimed");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0d] via-[#141417] to-[#2b0a14] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl p-8 shadow-2xl border border-white/20"
      >
        {state === "loading" && (
          <div className="text-center py-10">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-rose-500" />
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
                You're first in line. Claim it now before the offer rolls to the next person.
              </p>
            </div>
            {secondsLeft !== null && (
              <div className="flex items-center justify-center gap-2 text-rose-600 font-semibold">
                <Clock className="w-4 h-4" />
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} left
              </div>
            )}
            <Button
              onPress={claim}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold border-0 hover:opacity-90"
            >
              Claim this slot
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

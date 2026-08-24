import { useEffect, useState } from "react";
import { Rocket, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { Button } from "@/components/ui/button";

/**
 * Boost your barbershop — a €3 one-off payment that sends a short
 * "time for a haircut" reminder to up to 25 past clients.
 */
const BOOST_PAYMENT_LINK = "https://buy.stripe.com/dRmaEP0X05m6gd18fa2ZO05";

export function BoostBarbershopCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  // Handle the Stripe return: ?boost_session=cs_...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("boost_session");
    if (!sessionId) return;

    params.delete("boost_session");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);

    setClaiming(true);
    supabase.functions
      .invoke("boost-barbershop", { body: { action: "claim", session_id: sessionId } })
      .then(({ data, error }) => {
        if (error) throw error;
        setSentCount(Number(data?.sent ?? 0));
        toast({
          title: "Boost sent",
          description: `${data?.sent ?? 0} client${data?.sent === 1 ? "" : "s"} received a reminder.`,
        });
      })
      .catch((e) =>
        toast({
          title: "Boost failed",
          description: e?.message ?? "Please try again.",
          variant: "destructive",
        })
      )
      .finally(() => setClaiming(false));
  }, [toast]);

  const startBoost = () => {
    haptic("medium");
    setLoading(true);
    window.location.href = BOOST_PAYMENT_LINK;
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[#1C1C1E] p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 right-[-10%] h-44 w-44 rounded-full blur-[50px] opacity-60"
        style={{ background: "radial-gradient(circle, rgba(10,132,255,0.9), transparent 70%)" }}
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#0A84FF]/15 flex items-center justify-center text-[#0A84FF]">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-white">Boost your barbershop</p>
            <p className="text-[12px] text-[#8E8E93]">One-off €3 · up to 25 past clients</p>
          </div>
        </div>

        <p className="mt-4 text-[13px] leading-5 text-[#8E8E93]">
          We email your previous clients a short, friendly reminder that it's time for a fresh cut, with a
          direct link to your booking page.
        </p>

        {sentCount !== null && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#30D158]/10 px-3.5 py-2.5 text-[13px] text-[#30D158]">
            <Check className="h-4 w-4" />
            {sentCount} reminder{sentCount === 1 ? "" : "s"} sent
          </div>
        )}

        <Button
          onClick={startBoost}
          disabled={loading || claiming}
          className="mt-4 h-12 w-full rounded-2xl bg-[#0A84FF] text-[15px] font-semibold text-white hover:bg-[#0A84FF]/90 active:scale-[0.98] transition-transform"
        >
          {loading || claiming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Boost for €3"
          )}
        </Button>
      </div>
    </div>
  );
}

export default BoostBarbershopCard;

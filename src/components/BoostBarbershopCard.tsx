import { useEffect, useState } from "react";
import { Rocket, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { Button } from "@/components/ui/button";

/**
 * Boost your barbershop — a €3 one-off payment that sends a short
 * "time for a haircut" reminder to up to 25 past clients.
 * Payment goes through the boost-barbershop edge function so the
 * reminders are actually claimed and sent on return.
 */

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

  const startBoost = async () => {
    haptic("medium");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("boost-barbershop", {
        body: { action: "checkout", origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (e: any) {
      setLoading(false);
      toast({
        title: "Couldn't start checkout",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[#141417] p-[1px]">
      {/* Gradient ring border */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[28px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(10,132,255,0.65), rgba(255,69,120,0.45) 55%, rgba(10,132,255,0.15))",
        }}
      />
      <div className="relative rounded-[27px] bg-[#141417] p-5 overflow-hidden">
        {/* Ambient glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 right-[-12%] h-48 w-48 rounded-full blur-[55px] opacity-70 animate-aurora-drift"
          style={{ background: "radial-gradient(circle, rgba(10,132,255,0.85), transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-[-8%] h-36 w-36 rounded-full blur-[50px] opacity-40 animate-aurora-drift"
          style={{
            background: "radial-gradient(circle, rgba(255,69,120,0.8), transparent 70%)",
            animationDelay: "-7s",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#0A84FF]/25 to-[#FF4578]/15 border border-white/10 flex items-center justify-center text-[#0A84FF]">
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

          {/* Boost button — gradient ring + light sweep */}
          <Button
            onClick={startBoost}
            disabled={loading || claiming}
            className="group relative mt-4 h-12 w-full rounded-2xl p-0 overflow-hidden border-0 bg-transparent hover:bg-transparent active:scale-[0.98] transition-transform"
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  "linear-gradient(120deg, #0A84FF 0%, #5E5CE6 38%, #A855F7 62%, #FF4578 88%, #FF8A5A 100%)",
              }}
            />
            <span
              aria-hidden
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background:
                  "linear-gradient(120deg, #3B9BFF 0%, #7A76F0 38%, #BD7BFF 62%, #FF6B94 88%, #FFA277 100%)",
              }}
            />
            {/* Light sweep */}
            <span
              aria-hidden
              className="pointer-events-none absolute top-0 bottom-0 w-1/3 animate-light-sweep"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
                filter: "blur(2px)",
              }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2 text-[15px] font-semibold text-white">
              {loading || claiming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Boost for €3
                </>
              )}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BoostBarbershopCard;

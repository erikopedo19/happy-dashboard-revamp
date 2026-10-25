import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePremium } from "@/hooks/use-premium";

export default function PricingSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { refresh, isPremium } = usePremium();
  const [confirmed, setConfirmed] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    setWaiting(false);
    const check = async () => {
      const { data, error } = await supabase.functions.invoke("manage-subscription", { body: { action: "sync", ...(sessionId ? { session_id: sessionId } : {}) } });
      if (stopped) return;
      await refreshRef.current();
      if (!error && data?.ok && data?.subscribed === true) {
        setConfirmed(true);
        window.dispatchEvent(new Event("premium:refresh"));
        return;
      }
      tries++;
      if (tries >= 15) { setWaiting(true); return; }
      timer = setTimeout(check, 1500);
    };
    check();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [sessionId, attempt]);

  const active = confirmed && isPremium;
  return (
    <main className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-y-auto bg-background px-6 text-center text-foreground">
      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        {active ? <Check className="h-10 w-10" /> : <Loader2 className={`h-9 w-9 ${waiting ? "" : "animate-spin"}`} />}
      </div>
      <h1 className="mt-6 text-3xl font-bold">{active ? "Cutzioo Pro is active" : waiting ? "Still checking your payment" : "Confirming your payment"}</h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        {active ? "Your membership is ready." : waiting ? "Your membership is not confirmed yet. Please check again before making another payment." : "Waiting for Stripe to confirm your membership."}
      </p>
      {active ? <Button className="mt-7" onClick={() => navigate("/dashboard", { replace: true })}>Continue to dashboard</Button> : waiting && (
        <div className="mt-7 flex flex-col gap-3">
          <Button onClick={() => setAttempt(n => n + 1)}><RefreshCw className="mr-2 h-4 w-4" />Check again</Button>
          <Button variant="ghost" onClick={() => navigate("/settings")}>Back to Settings</Button>
        </div>
      )}
    </main>
  );
}

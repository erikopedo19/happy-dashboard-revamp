import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePremium } from "@/hooks/use-premium";
import { PaymentSuccessDialog } from "@/components/PaymentSuccessDialog";

export default function PricingSuccess() {
  const navigate = useNavigate();
  const { refresh, isPremium } = usePremium();
  const [open, setOpen] = useState(false);
  const isPremiumRef = useRef(isPremium);
  const openRef = useRef(open);
  const refreshRef = useRef(refresh);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  isPremiumRef.current = isPremium;
  openRef.current = open;
  refreshRef.current = refresh;

  useEffect(() => {
    if (isPremium && !open) setOpen(true);
  }, [isPremium, open]);

  useEffect(() => {
    let tries = 0;
    const started = Date.now();
    const tick = async () => {
      if (openRef.current || isPremiumRef.current) {
        setOpen(true);
        return;
      }
      tries += 1;
      await refreshRef.current();
      // Never keep the user waiting: show success after ~4s max
      if (openRef.current || isPremiumRef.current || tries >= 5 || Date.now() - started >= 4000) {
        setOpen(true);
        return;
      }
      timeoutRef.current = setTimeout(tick, 800);
    };
    tick();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!open) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-3xl bg-card border p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">We received your payment</h2>
          <p className="text-muted-foreground text-sm">Finalising your subscription, please wait…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <PaymentSuccessDialog
        open={open}
        onOpenChange={setOpen}
        title="Congratulations!"
        subtitle={isPremium ? "Your payment was successful." : "Your payment was received; activation is being finalised."}
        price="9.99"
        currencySymbol="$"
        productName="Pro Plan (Monthly)"
        proceedButtonText="Go to Dashboard"
        backButtonText="Back to Pricing"
        onProceed={() => navigate("/admin")}
        onBack={() => navigate("/pricing")}
      />
    </div>
  );
}

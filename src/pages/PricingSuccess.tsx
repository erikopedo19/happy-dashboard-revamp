import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePremium } from "@/hooks/use-premium";
import { PaymentSuccessDialog } from "@/components/PaymentSuccessDialog";

export default function PricingSuccess() {
  const navigate = useNavigate();
  const { refresh, isPremium } = usePremium();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Poll for webhook to land
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      tries += 1;
      await refresh();
      if (!cancelled && !isPremium && tries < 10) {
        setTimeout(tick, 2000);
      } else {
        setOpen(true);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <PaymentSuccessDialog
        open={open}
        onOpenChange={setOpen}
        title="Congratulations!"
        subtitle="Your payment was successful."
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

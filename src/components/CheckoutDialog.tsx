import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ShieldCheck, Receipt } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface CheckoutItem {
  business_id: string;
  kind: "booking" | "product";
  item_id: string;
  title: string;
  amount: number;
  currency?: string;
  customer_email?: string | null;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CheckoutItem | null;
}

export function CheckoutDialog({ open, onOpenChange, item }: CheckoutDialogProps) {
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const currency = item?.currency || "EUR";
  const price = item
    ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(item.amount)
    : "";

  const pay = async () => {
    if (!item || !accepted || busy) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-payment-checkout", {
      body: {
        business_id: item.business_id,
        kind: item.kind,
        item_id: item.item_id,
        title: item.title,
        amount: item.amount,
        currency,
        customer_email: item.customer_email || undefined,
        accepted_terms: true,
        success_url: `${window.location.origin}${window.location.pathname}?paid=1`,
        cancel_url: window.location.href,
      },
    });
    setBusy(false);
    if (error || !data?.url) {
      toast({
        title: "Payment unavailable",
        description: "This business hasn't finished setting up payments yet.",
        variant: "destructive",
      });
      return;
    }
    window.location.href = data.url;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[28px] bg-[#15151A] border-white/[0.06] text-white p-6">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
          <Receipt className="w-5 h-5 text-rose-400" />
        </div>
        <h2 className="mt-3 text-[19px] font-semibold leading-tight">Pay for {item?.title}</h2>
        <p className="text-[13px] text-white/45">
          {price} · sales tax is calculated at checkout based on your location and shown as a separate line.
        </p>

        <label className="mt-4 flex items-start gap-3 rounded-2xl bg-white/[0.04] p-3.5 cursor-pointer">
          <Checkbox
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-0.5 border-white/25 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
          />
          <span className="text-[12.5px] leading-relaxed text-white/70">
            I agree to the{" "}
            <Link to="/terms" target="_blank" className="text-rose-400 underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" target="_blank" className="text-rose-400 underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <button
          onClick={pay}
          disabled={!accepted || busy}
          className={cn(
            "mt-4 w-full h-[52px] rounded-full text-[16px] font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2",
            accepted && !busy ? "bg-rose-500 text-white" : "bg-white/[0.07] text-white/35"
          )}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay ${price}`}
        </button>

        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11.5px] text-white/30">
          <ShieldCheck className="w-3.5 h-3.5" /> Secure payment by Stripe · card & PayPal
        </p>
      </DialogContent>
    </Dialog>
  );
}

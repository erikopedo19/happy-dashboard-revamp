import { useState } from "react";
import { Link } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Loader2, ShieldCheck, Receipt, Wallet } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface CheckoutItem {
  /** "card" goes through Stripe; "paypal" pays the barber's own PayPal account. */
  method?: "card" | "paypal";
  business_id: string;
  business_name?: string;
  kind: "booking" | "product";
  /** Required when kind === "booking". */
  service_id?: string;
  appointment_id?: string;
  /** Required when kind === "product". */
  product_id?: string;
  quantity?: number;
  title: string;
  amount: number;
  currency?: string;
  customer_email: string;
  customer_name?: string;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CheckoutItem | null;
}

async function readError(error: unknown, data: any): Promise<{ code?: string; message?: string }> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.clone().json().catch(() => null);
    return { code: body?.error, message: body?.message };
  }
  return { code: data?.error, message: data?.message };
}

export function CheckoutDialog({ open, onOpenChange, item }: CheckoutDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const isPayPal = item?.method === "paypal";
  const currency = item?.currency || "EUR";
  const price = item
    ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(item.amount)
    : "";
  const shop = item?.business_name || "your barber";

  const pay = async () => {
    if (!item || !accepted || busy) return;
    setBusy(true);
    setProblem(null);
    const back = window.location.pathname + window.location.search;
    const { data, error } = isPayPal
      ? await supabase.functions.invoke("paypal-booking-checkout", {
          body: {
            action: "create",
            business_id: item.business_id,
            appointment_id: item.appointment_id,
            customer_email: item.customer_email,
            customer_name: item.customer_name,
            terms_accepted: true,
            return_origin: window.location.origin,
            return_path: back,
          },
        })
      : await supabase.functions.invoke("create-payment-checkout", {
          body: {
            business_id: item.business_id,
            kind: item.kind,
            service_id: item.service_id,
            appointment_id: item.appointment_id,
            product_id: item.product_id,
            quantity: item.quantity ?? 1,
            customer_email: item.customer_email,
            customer_name: item.customer_name,
            terms_accepted: true,
            success_url: `${window.location.origin}${window.location.pathname}?paid=1`,
            cancel_url: `${window.location.origin}/payment-failed?type=booking&reason=cancelled&back=${encodeURIComponent(back)}`,
          },
        });
    if (error || !data?.url) {
      const { code, message } = await readError(error, data);
      setBusy(false);
      if (code === "not_set_up" || code === "paypal_not_set_up") {
        window.location.href = `/payment-failed?type=booking&reason=not_set_up&back=${encodeURIComponent(back)}`;
        return;
      }
      setProblem(message || "Online payment couldn't start. Your booking is kept — you can pay at the shop.");
      return;
    }
    window.location.href = data.url;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setProblem(null); setAccepted(false); } onOpenChange(o); }}>
      <DialogContent className="max-w-sm rounded-[28px] bg-white dark:bg-[#15151A] border-black/[0.06] dark:border-white/[0.06] text-black dark:text-white p-6">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
          {isPayPal ? <Wallet className="w-5 h-5 text-rose-400" /> : <Receipt className="w-5 h-5 text-rose-400" />}
        </div>
        <h2 className="mt-3 text-[19px] font-semibold leading-tight">Pay for {item?.title}</h2>
        <p className="text-[13px] text-black/45 dark:text-white/45">
          {price} · the final price set by {shop}.{" "}
          {isPayPal ? `You pay ${shop} directly with PayPal.` : `Your card payment goes to ${shop}.`}
        </p>

        <label className="mt-4 flex items-start gap-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] p-3.5 cursor-pointer">
          <Checkbox
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-0.5 border-black/25 dark:border-white/25 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
          />
          <span className="text-[12.5px] leading-relaxed text-black/70 dark:text-white/70">
            I agree to the{" "}
            <Link to="/terms" target="_blank" className="text-rose-400 underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" target="_blank" className="text-rose-400 underline underline-offset-2">
              Privacy Policy
            </Link>
            , and understand {shop} is the seller and handles refunds.
          </span>
        </label>

        {problem && (
          <p role="alert" className="mt-3 rounded-2xl bg-rose-500/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-rose-500">
            {problem}
          </p>
        )}

        <button
          onClick={pay}
          disabled={!accepted || busy}
          className={cn(
            "mt-4 w-full h-[52px] rounded-full text-[16px] font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2",
            accepted && !busy ? "bg-rose-500 text-white" : "bg-black/[0.06] dark:bg-white/[0.07] text-black/35 dark:text-white/35"
          )}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isPayPal ? `Pay ${price} with PayPal` : `Pay ${price}`}
        </button>

        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11.5px] text-black/35 dark:text-white/30">
          <ShieldCheck className="w-3.5 h-3.5" /> {isPayPal ? "Secure payment by PayPal" : "Secure payment by Stripe"}
        </p>
      </DialogContent>
    </Dialog>
  );
}

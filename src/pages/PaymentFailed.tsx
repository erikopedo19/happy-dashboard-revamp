import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, CreditCard, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const REASONS: Record<string, { title: string; text: string; tip: string }> = {
  cancelled: { title: "Payment cancelled", text: "You left the checkout before paying. Nothing was charged.", tip: "Try again whenever you're ready." },
  card_declined: { title: "Card declined", text: "Your bank declined this payment.", tip: "Try another card, PayPal, or contact your bank." },
  insufficient_funds: { title: "Not enough funds", text: "The card doesn't have enough balance for this payment.", tip: "Use another card or payment method." },
  expired_card: { title: "Card expired", text: "This card is past its expiry date.", tip: "Use a card that's still valid." },
  incorrect_cvc: { title: "Wrong security code", text: "The 3-digit code on the back didn't match.", tip: "Check the code and try again." },
  incorrect_number: { title: "Wrong card number", text: "The card number wasn't recognised.", tip: "Check the number and try again." },
  authentication_required: { title: "Bank check not completed", text: "Your bank asked you to confirm the payment, but it wasn't confirmed.", tip: "Try again and approve it in your bank app." },
  processing_error: { title: "Something went wrong", text: "The payment couldn't be processed right now.", tip: "Wait a minute and try again." },
  not_set_up: { title: "Payments not available", text: "This business hasn't finished setting up online payments yet.", tip: "You can still book and pay in the shop." },
  renewal_failed: { title: "Renewal payment failed", text: "We couldn't charge your card for your Pro plan.", tip: "Update your card in Manage subscription to keep Pro." },
};

const WHAT: Record<string, string> = {
  booking: "Booking payment",
  subscription: "Pro subscription",
  boost: "Past-client email",
};

export default function PaymentFailed() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const reason = REASONS[sp.get("reason") ?? ""] ?? REASONS.processing_error;
  const type = sp.get("type") ?? "booking";
  const back = sp.get("back");
  const retry = () => {
    if (back && back.startsWith("/")) nav(back);
    else if (type === "subscription") nav("/pricing");
    else if (type === "boost") nav("/settings");
    else nav(-1);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="w-full max-w-sm rounded-[28px] border border-border bg-card text-card-foreground p-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}
          className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center"
        >
          <AlertCircle className="w-7 h-7 text-destructive" />
        </motion.div>
        <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">{WHAT[type] ?? "Payment"}</p>
        <h1 className="mt-1 text-2xl font-semibold">{reason.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{reason.text}</p>
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-muted p-3 text-left text-sm">
          <CreditCard className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
          <span>{reason.tip}</span>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={retry} className="rounded-full"><RefreshCw className="w-4 h-4 mr-2" />Try again</Button>
          <Button variant="ghost" onClick={() => nav("/")} className="rounded-full"><ArrowLeft className="w-4 h-4 mr-2" />Back home</Button>
        </div>
      </motion.div>
    </div>
  );
}

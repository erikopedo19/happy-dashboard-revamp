import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function RefundPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-lg font-semibold">Refund &amp; Cancellation Policy</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6 text-sm leading-relaxed text-foreground/80">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Appointments paid by card</h2>
          <p>
            If you cancel an appointment at least 24 hours before its start time, the amount you paid online is refunded
            in full to the card you used. Cancellations inside 24 hours, or a no-show, may not be refunded — the shop
            decides, since the slot was reserved for you.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. If the shop cancels</h2>
          <p>
            If the barber or shop cancels your appointment, or cannot deliver the service, you always receive a full
            refund.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. How refunds are paid</h2>
          <p>
            Refunds go back to the original payment method through Stripe. They normally appear within 5–10 business
            days, depending on your bank. Taxes charged at checkout are refunded together with the payment.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Products</h2>
          <p>
            Products bought through a shop's page can be returned in their original condition within 14 days of
            purchase, unless the item is perishable or has been opened for hygiene reasons. Contact the shop to arrange
            the return.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Cutzioo subscriptions</h2>
          <p>
            Paid plans renew for the period you chose. You can cancel at any time from Settings and keep access until
            the end of the period you already paid for. If you are in the EU/UK and cancel a new subscription within 14
            days without having used the paid features, contact us for a full refund.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. How to request a refund</h2>
          <p>
            Email{" "}
            <a className="underline hover:text-foreground" href="mailto:support@cutzioo.com">
              support@cutzioo.com
            </a>{" "}
            with your booking or order reference. We respond within 5 business days. See also our{" "}
            <Link className="underline hover:text-foreground" to="/terms">
              Terms of Service
            </Link>
            .
          </p>
        </section>

        <p className="text-xs text-foreground/50 pt-4">Last updated: September 2026</p>
      </main>
    </div>
  );
}

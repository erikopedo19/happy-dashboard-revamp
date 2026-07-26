import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-foreground/5 transition"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Terms of Service</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6 text-sm leading-relaxed text-foreground/80">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Cutzioo, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. Use of the Platform</h2>
          <p>
            Cutzioo connects clients with barbers and barbershops. You must use the platform only for lawful purposes and in accordance with these terms. You are responsible for any content you post or submit.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Bookings and Cancellations</h2>
          <p>
            Bookings made through the platform are agreements between clients and providers. Cancellations and no-shows may be subject to the policies set by each provider.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Limitation of Liability</h2>
          <p>
            Cutzioo is not responsible for the quality of services provided by barbers or barbershops. We provide the platform on an "as is" basis without warranties of any kind.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Changes to These Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the platform after changes means you accept the revised terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us through the app or at our support email.
          </p>
        </section>

        <p className="text-xs text-foreground/50 pt-4">Last updated: July 2026</p>
      </main>
    </div>
  );
}

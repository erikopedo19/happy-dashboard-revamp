import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
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
          <h1 className="text-lg font-semibold">Privacy Policy | YOU HAVE AGREED OUR TERMS-PRIVACYPOLICY</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6 text-sm leading-relaxed text-foreground/80">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. Information We Collect</h2>
          <p>
            We collect the information you provide when creating an account, such as your name, email, phone number,
            business details, and booking preferences. We also collect usage data to improve the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. IP Address Collection and Rate Limiting</h2>
          <p>
            When you place a booking, we collect your IP address to enforce rate limits and protect the platform from
            abuse. If more than 3 booking attempts are made from the same IP within one minute, that IP will be blocked
            from making further bookings for 7 minutes. IP data is used only for security and anti-abuse purposes and is
            not sold or shared for marketing.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. How We Use Your Information</h2>
          <p>
            Your information is used to provide and improve the service, process bookings, communicate with users, and
            ensure platform security. We do not sell your personal data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Sharing of Information</h2>
          <p>
            We may share data with service providers who help us operate the platform. We only share what is necessary
            and require those providers to protect your data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Data Security</h2>
          <p>
            We take reasonable measures to protect your data from unauthorized access, loss, or misuse. No system is
            completely secure, so we encourage you to use strong passwords.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">6. Your Rights</h2>
          <p>
            You can access, update, or delete your account information at any time through the app settings. You may
            also contact us to request data deletion.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">7. Cookies and Tracking</h2>
          <p>
            We may use cookies and similar technologies to improve your experience and analyze platform usage. You can
            manage cookie preferences through your browser settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes through the
            app or by email.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">9. Contact</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us through the app or at our support
            email.
          </p>
        </section>

        <p className="text-xs text-foreground/50 pt-4">Last updated: July 28, 2026</p>
      </main>
    </div>
  );
}

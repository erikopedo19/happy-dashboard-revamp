import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function CookiesPolicy() {
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
          <h1 className="text-lg font-semibold">Cookies Policy</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6 text-sm leading-relaxed text-foreground/80">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">1. What cookies are</h2>
          <p>
            Cookies are small files stored on your device. Cutzioo also uses similar technologies such as local storage
            to keep you signed in and remember your preferences.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">2. Cookies we use</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-foreground">Strictly necessary</strong> — sign-in session, security and anti-abuse
              protection, and your language and theme choices. These are always on because the app cannot work without
              them.
            </li>
            <li>
              <strong className="text-foreground">Payment</strong> — when you pay by card, Stripe sets cookies to
              process the payment securely and prevent fraud.
            </li>
            <li>
              <strong className="text-foreground">Analytics</strong> — anonymous usage counts that help us understand
              which features are used. Only set if you accept optional cookies.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">3. We do not use advertising cookies</h2>
          <p>
            We do not run advertising or cross-site tracking pixels, and we never sell data collected through cookies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">4. Managing your choices</h2>
          <p>
            You can accept or decline optional cookies in the banner shown on your first visit. You can change your mind
            at any time by clearing this site's data in your browser, which brings the banner back. Browsers also let
            you block or delete cookies entirely, though the app may not work correctly without the necessary ones.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">5. Contact</h2>
          <p>
            Questions about cookies? Email{" "}
            <a className="underline hover:text-foreground" href="mailto:support@cutzioo.com">
              support@cutzioo.com
            </a>
            . See also our{" "}
            <Link className="underline hover:text-foreground" to="/privacy">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <p className="text-xs text-foreground/50 pt-4">Last updated: September 2026</p>
      </main>
    </div>
  );
}
